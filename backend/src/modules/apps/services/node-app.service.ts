import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { App, AppType, AppStatus } from '../entities/app.entity.js';
import { AppEnvironment } from '../entities/app-environment.entity.js';
import { Domain } from '../../domains/entities/domain.entity.js';
import { Pm2Service } from './pm2.service.js';
import { PortAllocationService } from './port-allocation.service.js';
import { VhostService } from '../../domains/services/vhost.service.js';
import { CommandExecutorService } from '../../../core/executor/command-executor.service.js';
import { PathResolverService } from '../../../core/distro/path-resolver.service.js';
import { TransactionManagerService } from '../../../core/rollback/transaction-manager.service.js';
import { LoggerService } from '../../../common/logger/logger.service.js';
import { CreateAppDto } from '../dto/create-app.dto.js';
import { UpdateAppDto } from '../dto/update-app.dto.js';
import { RuntimeType } from '../../domains/entities/domain.entity.js';

@Injectable()
export class NodeAppService {
  constructor(
    @InjectRepository(App)
    private readonly appRepository: Repository<App>,
    @InjectRepository(AppEnvironment)
    private readonly envRepository: Repository<AppEnvironment>,
    @InjectRepository(Domain)
    private readonly domainRepository: Repository<Domain>,
    private readonly pm2Service: Pm2Service,
    private readonly portAllocation: PortAllocationService,
    private readonly vhostService: VhostService,
    private readonly commandExecutor: CommandExecutorService,
    private readonly pathResolver: PathResolverService,
    private readonly transactionManager: TransactionManagerService,
    private readonly logger: LoggerService,
  ) {}

  async deploy(dto: CreateAppDto): Promise<App> {
    if (dto.type !== AppType.NODEJS) {
      throw new BadRequestException('This service only handles Node.js apps');
    }

    const domain = await this.domainRepository.findOne({
      where: { id: dto.domainId },
      relations: ['systemUser'],
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    const username = domain.systemUser.username;

    return this.transactionManager.withTransaction(async (transactionId) => {
      // Allocate port
      const port = await this.portAllocation.allocatePort(dto.port);

      // Add rollback action for port
      this.transactionManager.addRollbackAction(transactionId, async () => {
        await this.portAllocation.releasePort(port);
      });

      // Create app path
      const appPath = dto.path || `${this.pathResolver.getUserPublicHtml(username)}/${dto.name}`;

      // Create app directory
      await this.commandExecutor.execute('mkdir', ['-p', appPath]);
      await this.commandExecutor.execute('mkdir', ['-p', `${appPath}/logs`]);
      await this.commandExecutor.execute('chown', ['-R', `${username}:${username}`, appPath]);

      // Add rollback for directory
      this.transactionManager.addRollbackAction(transactionId, async () => {
        await this.commandExecutor.execute('rm', ['-rf', appPath]);
      });

      // Create app record
      const app = this.appRepository.create({
        name: dto.name,
        type: AppType.NODEJS,
        framework: dto.framework,
        path: appPath,
        entryPoint: dto.entryPoint || 'index.js',
        port,
        status: AppStatus.PENDING,
        pm2Config: dto.pm2Config,
        nodeVersion: dto.nodeVersion || '20',
        gitRepository: dto.gitRepository,
        gitBranch: dto.gitBranch || 'main',
        buildCommand: dto.buildCommand,
        startCommand: dto.startCommand,
        installCommand: dto.installCommand || 'npm install',
        autoDeploy: dto.autoDeploy ?? false,
        domainId: dto.domainId,
        pm2ProcessName: `${dto.name}-${dto.domainId.substring(0, 8)}`,
      });

      const savedApp = await this.appRepository.save(app);

      // Add rollback for app record
      this.transactionManager.addRollbackAction(transactionId, async () => {
        await this.appRepository.delete(savedApp.id);
      });

      // Generate and write ecosystem file
      const envVars = await this.getEnvVarsForApp(savedApp.id);
      await this.pm2Service.writeEcosystemFile(savedApp, envVars);

      // Generate reverse proxy config for Apache
      await this.generateReverseProxy(savedApp, domain, transactionId);

      this.logger.log(`Deployed Node.js app: ${dto.name} on port ${port}`, 'NodeAppService');
      return savedApp;
    });
  }

  async startApp(appId: string): Promise<App> {
    const app = await this.getAppWithDomain(appId);
    const username = app.domain.systemUser.username;

    // Write latest ecosystem file
    const envVars = await this.getEnvVarsForApp(appId);
    await this.pm2Service.writeEcosystemFile(app, envVars);

    // Start the app
    await this.pm2Service.startApp(app, username);

    // Update status
    app.status = AppStatus.RUNNING;
    return this.appRepository.save(app);
  }

  async stopApp(appId: string): Promise<App> {
    const app = await this.getAppWithDomain(appId);
    const username = app.domain.systemUser.username;

    await this.pm2Service.stopApp(app.pm2ProcessName!, username);

    app.status = AppStatus.STOPPED;
    return this.appRepository.save(app);
  }

  async restartApp(appId: string): Promise<App> {
    const app = await this.getAppWithDomain(appId);
    const username = app.domain.systemUser.username;

    await this.pm2Service.restartApp(app.pm2ProcessName!, username);

    app.status = AppStatus.RUNNING;
    return this.appRepository.save(app);
  }

  async reloadApp(appId: string): Promise<App> {
    const app = await this.getAppWithDomain(appId);
    const username = app.domain.systemUser.username;

    await this.pm2Service.reloadApp(app.pm2ProcessName!, username);

    return app;
  }

  async update(appId: string, dto: UpdateAppDto): Promise<App> {
    const app = await this.getAppWithDomain(appId);
    const username = app.domain.systemUser.username;

    // Update app record
    Object.assign(app, dto);
    const updatedApp = await this.appRepository.save(app);

    // If app is running, update ecosystem and reload
    if (app.status === AppStatus.RUNNING) {
      const envVars = await this.getEnvVarsForApp(appId);
      await this.pm2Service.writeEcosystemFile(updatedApp, envVars);
      await this.pm2Service.reloadApp(app.pm2ProcessName!, username);
    }

    return updatedApp;
  }

  async remove(appId: string): Promise<void> {
    const app = await this.getAppWithDomain(appId);
    const username = app.domain.systemUser.username;

    // Stop and delete PM2 process
    if (app.pm2ProcessName) {
      await this.pm2Service.deleteApp(app.pm2ProcessName, username);
    }

    // Delete environment variables
    await this.envRepository.delete({ appId });

    // Delete app record
    await this.appRepository.delete(appId);

    this.logger.log(`Removed Node.js app: ${app.name}`, 'NodeAppService');
  }

  async installDependencies(appId: string): Promise<void> {
    const app = await this.getAppWithDomain(appId);
    const username = app.domain.systemUser.username;

    app.status = AppStatus.DEPLOYING;
    await this.appRepository.save(app);

    try {
      const result = await this.commandExecutor.execute(
        'bash',
        ['-c', `cd ${app.path} && ${app.installCommand}`],
        { runAs: username, timeout: 300000 }, // 5 minutes timeout
      );

      if (!result.success) {
        throw new Error(`Install failed: ${result.stderr}`);
      }

      this.logger.log(`Installed dependencies for: ${app.name}`, 'NodeAppService');
    } catch (error) {
      app.status = AppStatus.ERROR;
      app.lastError = error instanceof Error ? error.message : String(error);
      await this.appRepository.save(app);
      throw error;
    }
  }

  async buildApp(appId: string): Promise<void> {
    const app = await this.getAppWithDomain(appId);

    if (!app.buildCommand) {
      return; // No build step needed
    }

    const username = app.domain.systemUser.username;

    try {
      const result = await this.commandExecutor.execute(
        'bash',
        ['-c', `cd ${app.path} && ${app.buildCommand}`],
        { runAs: username, timeout: 600000 }, // 10 minutes timeout
      );

      if (!result.success) {
        throw new Error(`Build failed: ${result.stderr}`);
      }

      this.logger.log(`Built app: ${app.name}`, 'NodeAppService');
    } catch (error) {
      app.status = AppStatus.ERROR;
      app.lastError = error instanceof Error ? error.message : String(error);
      await this.appRepository.save(app);
      throw error;
    }
  }

  async gitClone(appId: string): Promise<void> {
    const app = await this.getAppWithDomain(appId);

    if (!app.gitRepository) {
      return;
    }

    const username = app.domain.systemUser.username;

    try {
      const result = await this.commandExecutor.execute(
        'git',
        ['clone', '-b', app.gitBranch, '--single-branch', app.gitRepository, app.path],
        { runAs: username, timeout: 300000 },
      );

      if (!result.success) {
        throw new Error(`Git clone failed: ${result.stderr}`);
      }

      this.logger.log(`Cloned git repository for: ${app.name}`, 'NodeAppService');
    } catch (error) {
      app.status = AppStatus.ERROR;
      app.lastError = error instanceof Error ? error.message : String(error);
      await this.appRepository.save(app);
      throw error;
    }
  }

  async gitPull(appId: string): Promise<void> {
    const app = await this.getAppWithDomain(appId);

    if (!app.gitRepository) {
      return;
    }

    const username = app.domain.systemUser.username;

    try {
      const result = await this.commandExecutor.execute(
        'bash',
        ['-c', `cd ${app.path} && git pull origin ${app.gitBranch}`],
        { runAs: username, timeout: 120000 },
      );

      if (!result.success) {
        throw new Error(`Git pull failed: ${result.stderr}`);
      }

      this.logger.log(`Pulled latest changes for: ${app.name}`, 'NodeAppService');
    } catch (error) {
      app.status = AppStatus.ERROR;
      app.lastError = error instanceof Error ? error.message : String(error);
      await this.appRepository.save(app);
      throw error;
    }
  }

  private async getAppWithDomain(appId: string): Promise<App & { domain: Domain }> {
    const app = await this.appRepository.findOne({
      where: { id: appId },
      relations: ['domain', 'domain.systemUser'],
    });

    if (!app) {
      throw new NotFoundException('App not found');
    }

    return app as App & { domain: Domain };
  }

  private async getEnvVarsForApp(appId: string): Promise<Record<string, string>> {
    const envVars = await this.envRepository.find({ where: { appId } });
    const result: Record<string, string> = {};

    for (const env of envVars) {
      result[env.key] = env.isSecret ? env.decryptValue() : env.value;
    }

    return result;
  }

  private async generateReverseProxy(
    app: App,
    domain: Domain,
    transactionId: string,
  ): Promise<void> {
    const vhostConfig = await this.vhostService.generateVhostConfig({
      domain: domain.name,
      documentRoot: domain.documentRoot,
      username: domain.systemUser.username,
      runtimeType: RuntimeType.NODEJS,
      nodePort: app.port,
      sslEnabled: domain.sslEnabled,
      forceHttps: domain.forceHttps,
      wwwRedirect: domain.wwwRedirect,
    });

    await this.vhostService.writeVhostFile(domain.name, vhostConfig, transactionId);
    await this.vhostService.enableSite(domain.name);

    const validation = await this.vhostService.validateConfig();
    if (!validation.valid) {
      throw new Error(`Apache configuration error: ${validation.error}`);
    }

    await this.vhostService.reloadApache();
  }
}
