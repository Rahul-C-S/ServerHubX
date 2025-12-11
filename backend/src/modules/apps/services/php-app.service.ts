import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { App, AppType, AppStatus } from '../entities/app.entity.js';
import { AppEnvironment } from '../entities/app-environment.entity.js';
import { Domain, RuntimeType } from '../../domains/entities/domain.entity.js';
import { PhpFpmService } from '../../domains/services/php-fpm.service.js';
import { VhostService } from '../../domains/services/vhost.service.js';
import { CommandExecutorService } from '../../../core/executor/command-executor.service.js';
import { PathResolverService } from '../../../core/distro/path-resolver.service.js';
import { TransactionManagerService } from '../../../core/rollback/transaction-manager.service.js';
import { LoggerService } from '../../../common/logger/logger.service.js';
import { CreateAppDto } from '../dto/create-app.dto.js';
import { UpdateAppDto } from '../dto/update-app.dto.js';

@Injectable()
export class PhpAppService {
  constructor(
    @InjectRepository(App)
    private readonly appRepository: Repository<App>,
    @InjectRepository(AppEnvironment)
    private readonly envRepository: Repository<AppEnvironment>,
    @InjectRepository(Domain)
    private readonly domainRepository: Repository<Domain>,
    private readonly phpFpmService: PhpFpmService,
    private readonly vhostService: VhostService,
    private readonly commandExecutor: CommandExecutorService,
    private readonly pathResolver: PathResolverService,
    private readonly transactionManager: TransactionManagerService,
    private readonly logger: LoggerService,
  ) {}

  async deploy(dto: CreateAppDto): Promise<App> {
    if (dto.type !== AppType.PHP) {
      throw new BadRequestException('This service only handles PHP apps');
    }

    const domain = await this.domainRepository.findOne({
      where: { id: dto.domainId },
      relations: ['systemUser'],
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    const username = domain.systemUser.username;
    const phpVersion = dto.phpVersion || '8.2';

    return this.transactionManager.withTransaction(async (transactionId) => {
      // Create app path
      const appPath = dto.path || `${this.pathResolver.getUserPublicHtml(username)}/${dto.name}`;

      // Create app directory
      await this.commandExecutor.execute('mkdir', ['-p', appPath]);
      await this.commandExecutor.execute('chown', ['-R', `${username}:${username}`, appPath]);

      // Add rollback for directory
      this.transactionManager.addRollbackAction(transactionId, async () => {
        await this.commandExecutor.execute('rm', ['-rf', appPath]);
      });

      // Create app record
      const app = this.appRepository.create({
        name: dto.name,
        type: AppType.PHP,
        framework: dto.framework,
        path: appPath,
        entryPoint: dto.entryPoint || 'index.php',
        status: AppStatus.PENDING,
        phpVersion,
        gitRepository: dto.gitRepository,
        gitBranch: dto.gitBranch || 'main',
        buildCommand: dto.buildCommand,
        installCommand: dto.installCommand || 'composer install --no-dev --optimize-autoloader',
        autoDeploy: dto.autoDeploy ?? false,
        domainId: dto.domainId,
      });

      const savedApp = await this.appRepository.save(app);

      // Add rollback for app record
      this.transactionManager.addRollbackAction(transactionId, async () => {
        await this.appRepository.delete(savedApp.id);
      });

      // Create/update PHP-FPM pool
      await this.phpFpmService.writePoolConfig(
        {
          username,
          phpVersion,
        },
        transactionId,
      );

      await this.phpFpmService.reloadPhpFpm(phpVersion);

      // Generate VHost config
      const vhostConfig = await this.vhostService.generateVhostConfig({
        domain: domain.name,
        documentRoot: appPath,
        username,
        runtimeType: RuntimeType.PHP,
        phpVersion,
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

      savedApp.status = AppStatus.RUNNING;
      await this.appRepository.save(savedApp);

      this.logger.log(`Deployed PHP app: ${dto.name} with PHP ${phpVersion}`, 'PhpAppService');
      return savedApp;
    });
  }

  async update(appId: string, dto: UpdateAppDto): Promise<App> {
    const app = await this.getAppWithDomain(appId);
    const oldPhpVersion = app.phpVersion;

    // Update app record
    Object.assign(app, dto);
    const updatedApp = await this.appRepository.save(app);

    // If PHP version changed, update PHP-FPM pool
    if (dto.phpVersion && dto.phpVersion !== oldPhpVersion) {
      await this.setPhpVersion(appId, dto.phpVersion);
    }

    return updatedApp;
  }

  async remove(appId: string): Promise<void> {
    const app = await this.getAppWithDomain(appId);

    // Delete environment variables
    await this.envRepository.delete({ appId });

    // Delete app record
    await this.appRepository.delete(appId);

    this.logger.log(`Removed PHP app: ${app.name}`, 'PhpAppService');
  }

  async setPhpVersion(appId: string, phpVersion: string): Promise<App> {
    const app = await this.getAppWithDomain(appId);
    const username = app.domain.systemUser.username;
    const domain = app.domain;

    // Validate PHP version
    const availableVersions = await this.phpFpmService.getAvailablePhpVersions();
    if (!availableVersions.includes(phpVersion)) {
      throw new BadRequestException(
        `PHP version ${phpVersion} is not available. Available versions: ${availableVersions.join(', ')}`,
      );
    }

    // Update PHP-FPM pool with new version
    await this.phpFpmService.writePoolConfig(
      {
        username,
        phpVersion,
      },
      'php-version-update',
    );

    await this.phpFpmService.reloadPhpFpm(phpVersion);

    // Update VHost config
    const vhostConfig = await this.vhostService.generateVhostConfig({
      domain: domain.name,
      documentRoot: app.path,
      username,
      runtimeType: RuntimeType.PHP,
      phpVersion,
      sslEnabled: domain.sslEnabled,
      forceHttps: domain.forceHttps,
      wwwRedirect: domain.wwwRedirect,
    });

    await this.vhostService.writeVhostFile(domain.name, vhostConfig, 'php-version-update');
    await this.vhostService.reloadApache();

    // Update app record
    app.phpVersion = phpVersion;
    const updatedApp = await this.appRepository.save(app);

    this.logger.log(`Changed PHP version to ${phpVersion} for: ${app.name}`, 'PhpAppService');
    return updatedApp;
  }

  async getAvailablePhpVersions(): Promise<string[]> {
    return this.phpFpmService.getAvailablePhpVersions();
  }

  async runComposerInstall(appId: string): Promise<void> {
    const app = await this.getAppWithDomain(appId);
    const username = app.domain.systemUser.username;

    // Check if composer.json exists
    const checkResult = await this.commandExecutor.execute(
      'find',
      [app.path, '-maxdepth', '1', '-name', 'composer.json'],
    );

    if (!checkResult.stdout.includes('composer.json')) {
      this.logger.log(`No composer.json found for: ${app.name}`, 'PhpAppService');
      return;
    }

    app.status = AppStatus.DEPLOYING;
    await this.appRepository.save(app);

    try {
      const result = await this.commandExecutor.execute(
        'bash',
        ['-c', `cd ${app.path} && composer install --no-dev --optimize-autoloader`],
        { runAs: username, timeout: 300000 }, // 5 minutes timeout
      );

      if (!result.success) {
        throw new Error(`Composer install failed: ${result.stderr}`);
      }

      app.status = AppStatus.RUNNING;
      await this.appRepository.save(app);

      this.logger.log(`Ran composer install for: ${app.name}`, 'PhpAppService');
    } catch (error) {
      app.status = AppStatus.ERROR;
      app.lastError = error instanceof Error ? error.message : String(error);
      await this.appRepository.save(app);
      throw error;
    }
  }

  async runComposerUpdate(appId: string): Promise<void> {
    const app = await this.getAppWithDomain(appId);
    const username = app.domain.systemUser.username;

    try {
      const result = await this.commandExecutor.execute(
        'bash',
        ['-c', `cd ${app.path} && composer update --no-dev --optimize-autoloader`],
        { runAs: username, timeout: 300000 },
      );

      if (!result.success) {
        throw new Error(`Composer update failed: ${result.stderr}`);
      }

      this.logger.log(`Ran composer update for: ${app.name}`, 'PhpAppService');
    } catch (error) {
      app.status = AppStatus.ERROR;
      app.lastError = error instanceof Error ? error.message : String(error);
      await this.appRepository.save(app);
      throw error;
    }
  }

  async clearOpcache(appId: string): Promise<void> {
    const app = await this.getAppWithDomain(appId);

    // Create a temporary PHP file to clear opcache
    const clearScript = `<?php
if (function_exists('opcache_reset')) {
    opcache_reset();
    echo 'OPCache cleared';
} else {
    echo 'OPCache not enabled';
}
`;

    const scriptPath = `${app.path}/_opcache_clear.php`;

    await this.commandExecutor.execute('tee', [scriptPath], { stdin: clearScript });

    // Execute the script via curl (assuming local access)
    await this.commandExecutor.execute(
      'curl',
      ['-s', `http://127.0.0.1/_opcache_clear.php`],
      { timeout: 5000 },
    );

    // Remove the temporary script
    await this.commandExecutor.execute('rm', ['-f', scriptPath]);

    this.logger.log(`Cleared OPCache for: ${app.name}`, 'PhpAppService');
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

      this.logger.log(`Cloned git repository for: ${app.name}`, 'PhpAppService');
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

      this.logger.log(`Pulled latest changes for: ${app.name}`, 'PhpAppService');
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
}
