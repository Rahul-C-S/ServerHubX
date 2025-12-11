import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CronExpressionParser } from 'cron-parser';
import { CronJob } from './entities/cron-job.entity';
import { Domain } from '../domains/entities/domain.entity';
import { CommandExecutorService } from '../../core/executor/command-executor.service';
import { AuditLoggerService } from '../../core/audit/audit-logger.service';
import { AuditResourceType, AuditOperationType } from '../../core/audit/entities/audit-log.entity';
import type { CreateCronJobDto, UpdateCronJobDto } from './dto/cron.dto';
import type { User } from '../users/entities/user.entity';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    @InjectRepository(CronJob)
    private cronJobRepository: Repository<CronJob>,
    @InjectRepository(Domain)
    private domainRepository: Repository<Domain>,
    private commandExecutor: CommandExecutorService,
    private auditLogger: AuditLoggerService,
  ) {}

  async findAll(domainId?: string): Promise<CronJob[]> {
    const query = this.cronJobRepository
      .createQueryBuilder('cron')
      .leftJoinAndSelect('cron.domain', 'domain')
      .orderBy('cron.createdAt', 'DESC');

    if (domainId) {
      query.where('cron.domainId = :domainId', { domainId });
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<CronJob> {
    const cronJob = await this.cronJobRepository.findOne({
      where: { id },
      relations: ['domain', 'domain.systemUser'],
    });

    if (!cronJob) {
      throw new NotFoundException('Cron job not found');
    }

    return cronJob;
  }

  async create(dto: CreateCronJobDto, user: User): Promise<CronJob> {
    const domain = await this.domainRepository.findOne({
      where: { id: dto.domainId },
      relations: ['systemUser'],
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    if (!this.validateCronExpression(dto.schedule)) {
      throw new BadRequestException('Invalid cron expression');
    }

    const cronJob = this.cronJobRepository.create({
      ...dto,
      nextRunAt: this.calculateNextRun(dto.schedule),
    });

    await this.cronJobRepository.save(cronJob);

    // Write to user's crontab
    await this.syncUserCrontab(domain.systemUser.username);

    await this.auditLogger.log({
      operationType: AuditOperationType.CREATE,
      resourceType: AuditResourceType.CRON_JOB,
      resourceId: cronJob.id,
      description: `Cron job created for domain ${dto.domainId}`,
      metadata: { domainId: dto.domainId, schedule: dto.schedule },
    }, { userId: user.id });

    return cronJob;
  }

  async update(id: string, dto: UpdateCronJobDto, user: User): Promise<CronJob> {
    const cronJob = await this.findOne(id);

    if (dto.schedule && !this.validateCronExpression(dto.schedule)) {
      throw new BadRequestException('Invalid cron expression');
    }

    Object.assign(cronJob, dto);

    if (dto.schedule) {
      cronJob.nextRunAt = this.calculateNextRun(dto.schedule);
    }

    await this.cronJobRepository.save(cronJob);

    // Resync crontab
    await this.syncUserCrontab(cronJob.domain.systemUser.username);

    await this.auditLogger.log({
      operationType: AuditOperationType.UPDATE,
      resourceType: AuditResourceType.CRON_JOB,
      resourceId: id,
      description: `Cron job updated`,
      metadata: dto as unknown as Record<string, unknown>,
    }, { userId: user.id });

    return cronJob;
  }

  async delete(id: string, user: User): Promise<void> {
    const cronJob = await this.findOne(id);
    const username = cronJob.domain.systemUser.username;

    await this.cronJobRepository.remove(cronJob);

    // Resync crontab
    await this.syncUserCrontab(username);

    await this.auditLogger.log({
      operationType: AuditOperationType.DELETE,
      resourceType: AuditResourceType.CRON_JOB,
      resourceId: id,
      description: `Cron job deleted`,
      metadata: { domainId: cronJob.domainId },
    }, { userId: user.id });
  }

  async runNow(id: string, user: User): Promise<{ output: string; exitCode: number }> {
    const cronJob = await this.findOne(id);
    const username = cronJob.domain.systemUser.username;

    await this.auditLogger.log({
      operationType: AuditOperationType.EXECUTE,
      resourceType: AuditResourceType.CRON_JOB,
      resourceId: id,
      description: `Cron job manually executed`,
    }, { userId: user.id });

    let output = '';
    let exitCode = 0;

    try {
      const result = await this.commandExecutor.execute(
        'sudo',
        ['-u', username, 'bash', '-c', cronJob.command],
        { timeout: cronJob.timeoutSeconds * 1000 },
      );
      output = result.stdout + result.stderr;
      exitCode = result.exitCode || 0;
    } catch (error) {
      output = error instanceof Error ? error.message : 'Unknown error';
      exitCode = 1;
    }

    // Update job stats
    await this.cronJobRepository.update(id, {
      lastRunAt: new Date(),
      lastOutput: output.substring(0, 10000), // Limit output size
      lastExitCode: exitCode,
      runCount: () => 'run_count + 1',
      failureCount: exitCode !== 0 ? () => 'failure_count + 1' : cronJob.failureCount,
    });

    return { output, exitCode };
  }

  async syncUserCrontab(username: string): Promise<void> {
    // Get all active cron jobs for this user
    const jobs = await this.cronJobRepository
      .createQueryBuilder('cron')
      .leftJoin('cron.domain', 'domain')
      .leftJoin('domain.systemUser', 'systemUser')
      .where('systemUser.username = :username', { username })
      .andWhere('cron.isActive = true')
      .getMany();

    // Generate crontab content
    const crontabLines = [
      '# Managed by ServerHubX - Do not edit manually',
      'SHELL=/bin/bash',
      'PATH=/usr/local/bin:/usr/bin:/bin',
      '',
    ];

    for (const job of jobs) {
      const envVars = job.environment
        ? Object.entries(job.environment)
            .map(([k, v]) => `${k}=${v}`)
            .join(' ')
        : '';

      const cmdLine = envVars ? `${envVars} ${job.command}` : job.command;
      crontabLines.push(`# ${job.name} (ID: ${job.id})`);
      crontabLines.push(`${job.schedule} ${cmdLine}`);
      crontabLines.push('');
    }

    const crontabContent = crontabLines.join('\n');

    // Write to user's crontab
    try {
      await this.commandExecutor.execute('bash', [
        '-c',
        `echo "${crontabContent.replace(/"/g, '\\"')}" | sudo crontab -u ${username} -`,
      ]);
      this.logger.log(`Crontab synced for user ${username}`);
    } catch (error) {
      this.logger.error(`Failed to sync crontab for ${username}: ${error}`);
      throw error;
    }
  }

  async parseCrontab(username: string): Promise<string[]> {
    try {
      const result = await this.commandExecutor.execute('sudo', [
        'crontab',
        '-l',
        '-u',
        username,
      ]);
      return result.stdout.split('\n').filter((line) => !line.startsWith('#') && line.trim());
    } catch {
      return [];
    }
  }

  validateCronExpression(expression: string): boolean {
    try {
      CronExpressionParser.parse(expression);
      return true;
    } catch {
      return false;
    }
  }

  calculateNextRun(expression: string): Date {
    try {
      const interval = CronExpressionParser.parse(expression);
      return interval.next().toDate();
    } catch {
      return new Date();
    }
  }

  describeCronExpression(expression: string): string {
    // Simple human-readable description
    const parts = expression.split(' ');
    if (parts.length < 5) return expression;

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    if (minute === '0' && hour === '0' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return 'Every day at midnight';
    }
    if (minute === '0' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return 'Every hour';
    }
    if (minute.includes('/')) {
      const interval = minute.split('/')[1];
      return `Every ${interval} minutes`;
    }
    if (hour.includes('/')) {
      const interval = hour.split('/')[1];
      return `Every ${interval} hours`;
    }

    return expression;
  }
}
