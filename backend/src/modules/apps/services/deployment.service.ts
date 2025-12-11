import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { App } from '../entities/app.entity.js';
import { DeploymentJobData, DeploymentJobResult } from '../processors/deployment.processor.js';
import { LoggerService } from '../../../common/logger/logger.service.js';

export interface DeploymentStatus {
  jobId: string;
  appId: string;
  action: string;
  state: string;
  progress: number;
  logs: string[];
  result?: DeploymentJobResult;
  createdAt: Date;
  processedAt?: Date;
  finishedAt?: Date;
}

@Injectable()
export class DeploymentService {
  constructor(
    @InjectQueue('deployment')
    private readonly deploymentQueue: Queue<DeploymentJobData>,
    @InjectRepository(App)
    private readonly appRepository: Repository<App>,
    private readonly logger: LoggerService,
  ) {}

  async queueDeployment(appId: string, userId?: string): Promise<string> {
    const app = await this.appRepository.findOne({ where: { id: appId } });

    if (!app) {
      throw new NotFoundException('App not found');
    }

    const job = await this.deploymentQueue.add(
      'deploy',
      {
        appId,
        action: 'deploy',
        userId,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          age: 86400, // Keep completed jobs for 24 hours
          count: 100, // Keep last 100 completed jobs
        },
        removeOnFail: {
          age: 604800, // Keep failed jobs for 7 days
        },
      },
    );

    this.logger.log(
      `Queued deployment job ${job.id} for app ${app.name}`,
      'DeploymentService',
    );

    return job.id!;
  }

  async queueRedeploy(appId: string, gitRef?: string, userId?: string): Promise<string> {
    const app = await this.appRepository.findOne({ where: { id: appId } });

    if (!app) {
      throw new NotFoundException('App not found');
    }

    const job = await this.deploymentQueue.add(
      'redeploy',
      {
        appId,
        action: 'redeploy',
        gitRef,
        userId,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );

    this.logger.log(
      `Queued redeploy job ${job.id} for app ${app.name}`,
      'DeploymentService',
    );

    return job.id!;
  }

  async queueRollback(appId: string, userId?: string): Promise<string> {
    const app = await this.appRepository.findOne({ where: { id: appId } });

    if (!app) {
      throw new NotFoundException('App not found');
    }

    const job = await this.deploymentQueue.add(
      'rollback',
      {
        appId,
        action: 'rollback',
        userId,
      },
      {
        attempts: 1, // Rollback should only try once
      },
    );

    this.logger.log(
      `Queued rollback job ${job.id} for app ${app.name}`,
      'DeploymentService',
    );

    return job.id!;
  }

  async getDeploymentStatus(jobId: string): Promise<DeploymentStatus | null> {
    const job = await this.deploymentQueue.getJob(jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();

    return {
      jobId: job.id!,
      appId: job.data.appId,
      action: job.data.action,
      state,
      progress: job.progress as number,
      logs: [], // BullMQ stores logs differently, would need Redis access
      result: job.returnvalue as DeploymentJobResult,
      createdAt: new Date(job.timestamp),
      processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
      finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
    };
  }

  async getAppDeployments(appId: string, limit: number = 10): Promise<DeploymentStatus[]> {
    const jobs = await this.deploymentQueue.getJobs(
      ['completed', 'failed', 'active', 'waiting'],
      0,
      100,
    );

    const appJobs = jobs
      .filter((job) => job.data.appId === appId)
      .slice(0, limit);

    const statuses: DeploymentStatus[] = [];

    for (const job of appJobs) {
      const status = await this.getDeploymentStatus(job.id!);
      if (status) {
        statuses.push(status);
      }
    }

    return statuses;
  }

  async cancelDeployment(jobId: string): Promise<boolean> {
    const job = await this.deploymentQueue.getJob(jobId);

    if (!job) {
      return false;
    }

    const state = await job.getState();

    if (state === 'waiting' || state === 'delayed') {
      await job.remove();
      return true;
    }

    // Cannot cancel active or completed jobs
    return false;
  }

  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.deploymentQueue.getWaitingCount(),
      this.deploymentQueue.getActiveCount(),
      this.deploymentQueue.getCompletedCount(),
      this.deploymentQueue.getFailedCount(),
      this.deploymentQueue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  async retryFailedDeployment(jobId: string): Promise<string | null> {
    const job = await this.deploymentQueue.getJob(jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();

    if (state !== 'failed') {
      return null;
    }

    await job.retry();
    return job.id!;
  }
}
