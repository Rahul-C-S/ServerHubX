import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { App, AppType, AppStatus } from '../entities/app.entity.js';
import { NodeAppService } from '../services/node-app.service.js';
import { PhpAppService } from '../services/php-app.service.js';
import { LoggerService } from '../../../common/logger/logger.service.js';

export interface DeploymentJobData {
  appId: string;
  action: 'deploy' | 'redeploy' | 'rollback';
  gitRef?: string;
  userId?: string;
}

export interface DeploymentJobResult {
  success: boolean;
  appId: string;
  action: string;
  error?: string;
  duration: number;
}

@Injectable()
@Processor('deployment')
export class DeploymentProcessor extends WorkerHost {
  constructor(
    @InjectRepository(App)
    private readonly appRepository: Repository<App>,
    private readonly nodeAppService: NodeAppService,
    private readonly phpAppService: PhpAppService,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  async process(job: Job<DeploymentJobData>): Promise<DeploymentJobResult> {
    const startTime = Date.now();
    const { appId, action, gitRef } = job.data;

    this.logger.log(
      `Processing deployment job ${job.id}: ${action} for app ${appId}`,
      'DeploymentProcessor',
    );

    const app = await this.appRepository.findOne({
      where: { id: appId },
      relations: ['domain', 'domain.systemUser'],
    });

    if (!app) {
      return {
        success: false,
        appId,
        action,
        error: 'App not found',
        duration: Date.now() - startTime,
      };
    }

    try {
      // Update status to deploying
      app.status = AppStatus.DEPLOYING;
      await this.appRepository.save(app);

      // Update job progress
      await job.updateProgress(10);

      switch (action) {
        case 'deploy':
        case 'redeploy':
          await this.runDeployment(app, job, gitRef);
          break;
        case 'rollback':
          await this.runRollback(app, job);
          break;
      }

      // Update status to running
      app.status = AppStatus.RUNNING;
      app.lastDeployedAt = new Date();
      app.lastError = undefined;
      await this.appRepository.save(app);

      await job.updateProgress(100);

      this.logger.log(
        `Deployment completed for app ${app.name}`,
        'DeploymentProcessor',
      );

      return {
        success: true,
        appId,
        action,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      app.status = AppStatus.ERROR;
      app.lastError = errorMessage;
      await this.appRepository.save(app);

      this.logger.error(
        `Deployment failed for app ${app.name}: ${errorMessage}`,
        'DeploymentProcessor',
      );

      return {
        success: false,
        appId,
        action,
        error: errorMessage,
        duration: Date.now() - startTime,
      };
    }
  }

  private async runDeployment(app: App, job: Job, gitRef?: string): Promise<void> {
    switch (app.type) {
      case AppType.NODEJS:
        await this.deployNodeApp(app, job, gitRef);
        break;
      case AppType.PHP:
        await this.deployPhpApp(app, job, gitRef);
        break;
      case AppType.STATIC:
        await this.deployStaticApp(app, job, gitRef);
        break;
      default:
        throw new Error(`Unsupported app type: ${app.type}`);
    }
  }

  private async deployNodeApp(app: App, job: Job, _gitRef?: string): Promise<void> {
    // Git pull
    if (app.gitRepository) {
      await job.updateProgress(20);
      await job.log('Pulling latest code from git...');
      await this.nodeAppService.gitPull(app.id);
    }

    // Install dependencies
    await job.updateProgress(40);
    await job.log('Installing dependencies...');
    await this.nodeAppService.installDependencies(app.id);

    // Build
    await job.updateProgress(60);
    await job.log('Building application...');
    await this.nodeAppService.buildApp(app.id);

    // Restart
    await job.updateProgress(80);
    await job.log('Restarting application...');
    await this.nodeAppService.restartApp(app.id);
  }

  private async deployPhpApp(app: App, job: Job, _gitRef?: string): Promise<void> {
    // Git pull
    if (app.gitRepository) {
      await job.updateProgress(30);
      await job.log('Pulling latest code from git...');
      await this.phpAppService.gitPull(app.id);
    }

    // Composer install
    await job.updateProgress(60);
    await job.log('Installing composer dependencies...');
    await this.phpAppService.runComposerInstall(app.id);

    // Clear OPCache
    await job.updateProgress(90);
    await job.log('Clearing OPCache...');
    await this.phpAppService.clearOpcache(app.id);
  }

  private async deployStaticApp(app: App, job: Job, _gitRef?: string): Promise<void> {
    // For static apps, just pull the latest code
    if (app.gitRepository) {
      await job.updateProgress(50);
      await job.log('Pulling latest code from git...');
      // Static apps use PHP service git methods or could use a shared service
      await this.phpAppService.gitPull(app.id);
    }
  }

  private async runRollback(_app: App, job: Job): Promise<void> {
    // Rollback implementation - git reset to previous commit
    await job.log('Rollback not yet implemented');
    throw new Error('Rollback functionality is not yet implemented');
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<DeploymentJobData>) {
    this.logger.log(
      `Job ${job.id} completed for app ${job.data.appId}`,
      'DeploymentProcessor',
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<DeploymentJobData>, error: Error) {
    this.logger.error(
      `Job ${job.id} failed for app ${job.data.appId}: ${error.message}`,
      'DeploymentProcessor',
    );
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job<DeploymentJobData>, progress: number) {
    this.logger.debug(
      `Job ${job.id} progress: ${progress}%`,
      'DeploymentProcessor',
    );
  }
}
