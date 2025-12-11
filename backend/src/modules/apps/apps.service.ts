import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { App, AppType, AppStatus } from './entities/app.entity.js';
import { AppEnvironment } from './entities/app-environment.entity.js';
import { NodeAppService } from './services/node-app.service.js';
import { PhpAppService } from './services/php-app.service.js';
import { Pm2Service, Pm2ProcessInfo, Pm2LogOutput } from './services/pm2.service.js';
import { CreateAppDto } from './dto/create-app.dto.js';
import { UpdateAppDto } from './dto/update-app.dto.js';
import { EnvVariableDto } from './dto/set-env.dto.js';
import { LoggerService } from '../../common/logger/logger.service.js';

export type AppWithStatus = App & {
  processInfo?: Pm2ProcessInfo;
};

@Injectable()
export class AppsService {
  constructor(
    @InjectRepository(App)
    private readonly appRepository: Repository<App>,
    @InjectRepository(AppEnvironment)
    private readonly envRepository: Repository<AppEnvironment>,
    private readonly nodeAppService: NodeAppService,
    private readonly phpAppService: PhpAppService,
    private readonly pm2Service: Pm2Service,
    private readonly logger: LoggerService,
  ) {}

  async findAll(domainId?: string): Promise<App[]> {
    const where = domainId ? { domainId } : {};
    return this.appRepository.find({
      where,
      relations: ['domain'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<App> {
    const app = await this.appRepository.findOne({
      where: { id },
      relations: ['domain', 'domain.systemUser'],
    });

    if (!app) {
      throw new NotFoundException('App not found');
    }

    return app;
  }

  async findOneWithStatus(id: string): Promise<AppWithStatus> {
    const app = await this.findOne(id);

    if (app.type === AppType.NODEJS && app.pm2ProcessName) {
      const username = (app as any).domain?.systemUser?.username;
      if (username) {
        const processInfo = await this.pm2Service.getAppStatus(app.pm2ProcessName, username);
        (app as AppWithStatus).processInfo = processInfo;
      }
    }

    return app as AppWithStatus;
  }

  async create(dto: CreateAppDto): Promise<App> {
    switch (dto.type) {
      case AppType.NODEJS:
        return this.nodeAppService.deploy(dto);
      case AppType.PHP:
        return this.phpAppService.deploy(dto);
      case AppType.STATIC:
        return this.createStaticApp(dto);
      default:
        throw new BadRequestException(`Unsupported app type: ${dto.type}`);
    }
  }

  async update(id: string, dto: UpdateAppDto): Promise<App> {
    const app = await this.findOne(id);

    switch (app.type) {
      case AppType.NODEJS:
        return this.nodeAppService.update(id, dto);
      case AppType.PHP:
        return this.phpAppService.update(id, dto);
      default:
        Object.assign(app, dto);
        return this.appRepository.save(app);
    }
  }

  async delete(id: string): Promise<void> {
    const app = await this.findOne(id);

    switch (app.type) {
      case AppType.NODEJS:
        await this.nodeAppService.remove(id);
        break;
      case AppType.PHP:
        await this.phpAppService.remove(id);
        break;
      default:
        await this.envRepository.delete({ appId: id });
        await this.appRepository.delete(id);
    }
  }

  async startApp(id: string): Promise<App> {
    const app = await this.findOne(id);

    if (app.type !== AppType.NODEJS) {
      throw new BadRequestException('Only Node.js apps can be started/stopped');
    }

    return this.nodeAppService.startApp(id);
  }

  async stopApp(id: string): Promise<App> {
    const app = await this.findOne(id);

    if (app.type !== AppType.NODEJS) {
      throw new BadRequestException('Only Node.js apps can be started/stopped');
    }

    return this.nodeAppService.stopApp(id);
  }

  async restartApp(id: string): Promise<App> {
    const app = await this.findOne(id);

    if (app.type !== AppType.NODEJS) {
      throw new BadRequestException('Only Node.js apps can be restarted');
    }

    return this.nodeAppService.restartApp(id);
  }

  async reloadApp(id: string): Promise<App> {
    const app = await this.findOne(id);

    if (app.type !== AppType.NODEJS) {
      throw new BadRequestException('Only Node.js apps support zero-downtime reload');
    }

    return this.nodeAppService.reloadApp(id);
  }

  async getAppLogs(id: string, lines: number = 100): Promise<Pm2LogOutput> {
    const app = await this.findOne(id);

    if (app.type !== AppType.NODEJS || !app.pm2ProcessName) {
      throw new BadRequestException('Logs are only available for Node.js apps');
    }

    const username = (app as any).domain?.systemUser?.username;
    if (!username) {
      throw new BadRequestException('Domain system user not found');
    }

    return this.pm2Service.getAppLogs(app.pm2ProcessName, username, lines);
  }

  async flushLogs(id: string): Promise<void> {
    const app = await this.findOne(id);

    if (app.type !== AppType.NODEJS || !app.pm2ProcessName) {
      throw new BadRequestException('Logs are only available for Node.js apps');
    }

    const username = (app as any).domain?.systemUser?.username;
    await this.pm2Service.flushLogs(app.pm2ProcessName, username);
  }

  // Environment Variables Management
  async getEnvVariables(appId: string): Promise<AppEnvironment[]> {
    await this.findOne(appId); // Verify app exists
    return this.envRepository.find({ where: { appId } });
  }

  async setEnvVariables(appId: string, variables: EnvVariableDto[]): Promise<AppEnvironment[]> {
    const app = await this.findOne(appId);

    const result: AppEnvironment[] = [];

    for (const variable of variables) {
      let env = await this.envRepository.findOne({
        where: { appId, key: variable.key },
      });

      if (env) {
        env.value = variable.value;
        env.isSecret = variable.isSecret ?? env.isSecret;
      } else {
        env = this.envRepository.create({
          appId,
          key: variable.key,
          value: variable.value,
          isSecret: variable.isSecret ?? false,
        });
      }

      result.push(await this.envRepository.save(env));
    }

    // If Node.js app is running, reload to pick up new env
    if (app.type === AppType.NODEJS && app.status === AppStatus.RUNNING) {
      await this.nodeAppService.reloadApp(appId);
    }

    return result;
  }

  async deleteEnvVariables(appId: string, keys: string[]): Promise<void> {
    const app = await this.findOne(appId);

    for (const key of keys) {
      await this.envRepository.delete({ appId, key });
    }

    // If Node.js app is running, reload to pick up env changes
    if (app.type === AppType.NODEJS && app.status === AppStatus.RUNNING) {
      await this.nodeAppService.reloadApp(appId);
    }
  }

  // Deployment methods
  async deploy(id: string): Promise<App> {
    const app = await this.findOne(id);

    app.status = AppStatus.DEPLOYING;
    await this.appRepository.save(app);

    try {
      // Git operations
      if (app.gitRepository) {
        if (app.type === AppType.NODEJS) {
          await this.nodeAppService.gitPull(id);
        } else if (app.type === AppType.PHP) {
          await this.phpAppService.gitPull(id);
        }
      }

      // Install dependencies
      if (app.type === AppType.NODEJS) {
        await this.nodeAppService.installDependencies(id);
        await this.nodeAppService.buildApp(id);
        await this.nodeAppService.restartApp(id);
      } else if (app.type === AppType.PHP) {
        await this.phpAppService.runComposerInstall(id);
      }

      app.status = AppStatus.RUNNING;
      app.lastDeployedAt = new Date();
      app.lastError = undefined;
      await this.appRepository.save(app);

      this.logger.log(`Deployed app: ${app.name}`, 'AppsService');
      return app;
    } catch (error) {
      app.status = AppStatus.ERROR;
      app.lastError = error instanceof Error ? error.message : String(error);
      await this.appRepository.save(app);
      throw error;
    }
  }

  private async createStaticApp(dto: CreateAppDto): Promise<App> {
    // Static apps don't need PM2 or PHP-FPM, just directory setup
    const app = this.appRepository.create({
      name: dto.name,
      type: AppType.STATIC,
      path: dto.path || '',
      entryPoint: 'index.html',
      status: AppStatus.RUNNING,
      gitRepository: dto.gitRepository,
      gitBranch: dto.gitBranch || 'main',
      autoDeploy: dto.autoDeploy ?? false,
      domainId: dto.domainId,
    });

    return this.appRepository.save(app);
  }
}
