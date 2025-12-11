import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as path from 'path';
import * as fs from 'fs/promises';
import { Backup, BackupType, BackupStatus, StorageType } from './entities/backup.entity';
import { BackupSchedule } from './entities/backup-schedule.entity';
import { Domain } from '../domains/entities/domain.entity';
import { StorageFactory } from './storage/storage.factory';
import { CommandExecutorService } from '../../core/executor/command-executor.service';
import { AuditLoggerService } from '../../core/audit/audit-logger.service';
import type {
  CreateBackupDto,
  CreateScheduleDto,
  UpdateScheduleDto,
  RestoreBackupDto,
} from './dto/backups.dto';
import { AuditResourceType, AuditOperationType } from '../../core/audit/entities/audit-log.entity';
import type { User } from '../users/entities/user.entity';

@Injectable()
export class BackupsService {
  private readonly logger = new Logger(BackupsService.name);
  private readonly tempDir = '/tmp/serverhubx-backups';

  constructor(
    @InjectRepository(Backup)
    private backupRepository: Repository<Backup>,
    @InjectRepository(BackupSchedule)
    private scheduleRepository: Repository<BackupSchedule>,
    @InjectRepository(Domain)
    private domainRepository: Repository<Domain>,
    @InjectQueue('backup')
    private backupQueue: Queue,
    private storageFactory: StorageFactory,
    private commandExecutor: CommandExecutorService,
    private auditLogger: AuditLoggerService,
  ) {}

  async findAll(domainId?: string): Promise<Backup[]> {
    const query = this.backupRepository
      .createQueryBuilder('backup')
      .leftJoinAndSelect('backup.domain', 'domain')
      .leftJoinAndSelect('backup.schedule', 'schedule')
      .orderBy('backup.createdAt', 'DESC');

    if (domainId) {
      query.where('backup.domainId = :domainId', { domainId });
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<Backup> {
    const backup = await this.backupRepository.findOne({
      where: { id },
      relations: ['domain', 'schedule'],
    });

    if (!backup) {
      throw new NotFoundException('Backup not found');
    }

    return backup;
  }

  async create(dto: CreateBackupDto, user: User): Promise<Backup> {
    const domain = await this.domainRepository.findOne({
      where: { id: dto.domainId },
      relations: ['systemUser'],
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = dto.name || `${domain.name}-${dto.type || 'full'}-${timestamp}`;

    const backup = this.backupRepository.create({
      name: backupName,
      type: dto.type || BackupType.FULL,
      status: BackupStatus.PENDING,
      storageType: dto.storageType || StorageType.LOCAL,
      domainId: dto.domainId,
    });

    await this.backupRepository.save(backup);

    await this.backupQueue.add(
      'create-backup',
      {
        backupId: backup.id,
        domainId: dto.domainId,
        type: backup.type,
        storageType: backup.storageType,
        storageConfig: dto.storageConfig || {},
        options: dto.options || {},
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    await this.auditLogger.log({
      operationType: AuditOperationType.CREATE,
      resourceType: AuditResourceType.BACKUP,
      resourceId: backup.id,
      description: `Backup created for domain ${dto.domainId}`,
      metadata: { domainId: dto.domainId, type: backup.type },
    }, { userId: user.id });

    return backup;
  }

  async delete(id: string, user: User): Promise<void> {
    const backup = await this.findOne(id);

    if (backup.status === BackupStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot delete backup in progress');
    }

    if (backup.storagePath) {
      try {
        const storage = this.storageFactory.create(
          backup.storageType,
          {},
        );
        await storage.delete(backup.storagePath);
      } catch (error) {
        this.logger.warn(`Failed to delete backup file: ${error}`);
      }
    }

    await this.backupRepository.remove(backup);

    await this.auditLogger.log({
      operationType: AuditOperationType.DELETE,
      resourceType: AuditResourceType.BACKUP,
      resourceId: id,
      description: `Backup deleted for domain ${backup.domainId}`,
      metadata: { domainId: backup.domainId },
    }, { userId: user.id });
  }

  async restore(id: string, dto: RestoreBackupDto, user: User): Promise<{ jobId: string }> {
    const backup = await this.findOne(id);

    if (backup.status !== BackupStatus.COMPLETED) {
      throw new BadRequestException('Can only restore completed backups');
    }

    const job = await this.backupQueue.add(
      'restore-backup',
      {
        backupId: id,
        restoreFiles: dto.restoreFiles ?? true,
        restoreDatabases: dto.restoreDatabases ?? true,
        restoreMail: dto.restoreMail ?? false,
        specificPaths: dto.specificPaths,
        specificDatabases: dto.specificDatabases,
      },
      {
        attempts: 1,
      },
    );

    await this.auditLogger.log({
      operationType: AuditOperationType.RESTORE,
      resourceType: AuditResourceType.BACKUP,
      resourceId: id,
      description: `Backup restore started`,
      metadata: { options: dto },
    }, { userId: user.id });

    return { jobId: job.id as string };
  }

  async getDownloadUrl(id: string): Promise<string> {
    const backup = await this.findOne(id);

    if (backup.status !== BackupStatus.COMPLETED || !backup.storagePath) {
      throw new BadRequestException('Backup not available for download');
    }

    if (backup.storageType === StorageType.LOCAL) {
      return backup.storagePath;
    }

    throw new BadRequestException('Direct download only available for local backups');
  }

  // Schedule management
  async findAllSchedules(domainId?: string): Promise<BackupSchedule[]> {
    const query = this.scheduleRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.domain', 'domain')
      .orderBy('schedule.createdAt', 'DESC');

    if (domainId) {
      query.where('schedule.domainId = :domainId', { domainId });
    }

    return query.getMany();
  }

  async findSchedule(id: string): Promise<BackupSchedule> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id },
      relations: ['domain', 'backups'],
    });

    if (!schedule) {
      throw new NotFoundException('Backup schedule not found');
    }

    return schedule;
  }

  async createSchedule(dto: CreateScheduleDto, user: User): Promise<BackupSchedule> {
    const domain = await this.domainRepository.findOne({
      where: { id: dto.domainId },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    if (!this.isValidCronExpression(dto.schedule)) {
      throw new BadRequestException('Invalid cron expression');
    }

    const schedule = this.scheduleRepository.create({
      name: dto.name,
      schedule: dto.schedule,
      type: dto.type || BackupType.FULL,
      storageType: dto.storageType || StorageType.LOCAL,
      retentionDays: dto.retentionDays || 30,
      maxBackups: dto.maxBackups || 10,
      enabled: dto.enabled ?? true,
      storageConfig: dto.storageConfig || {},
      options: dto.options || {},
      domainId: dto.domainId,
      nextRunAt: this.calculateNextRun(dto.schedule),
    });

    await this.scheduleRepository.save(schedule);

    await this.auditLogger.log({
      operationType: AuditOperationType.CREATE,
      resourceType: AuditResourceType.BACKUP_SCHEDULE,
      resourceId: schedule.id,
      description: `Backup schedule created for domain ${dto.domainId}`,
      metadata: { domainId: dto.domainId, schedule: dto.schedule },
    }, { userId: user.id });

    return schedule;
  }

  async updateSchedule(id: string, dto: UpdateScheduleDto, user: User): Promise<BackupSchedule> {
    const schedule = await this.findSchedule(id);

    if (dto.schedule && !this.isValidCronExpression(dto.schedule)) {
      throw new BadRequestException('Invalid cron expression');
    }

    Object.assign(schedule, dto);

    if (dto.schedule) {
      schedule.nextRunAt = this.calculateNextRun(dto.schedule);
    }

    await this.scheduleRepository.save(schedule);

    await this.auditLogger.log({
      operationType: AuditOperationType.UPDATE,
      resourceType: AuditResourceType.BACKUP_SCHEDULE,
      resourceId: id,
      description: `Backup schedule updated`,
      metadata: dto as unknown as Record<string, unknown>,
    }, { userId: user.id });

    return schedule;
  }

  async deleteSchedule(id: string, user: User): Promise<void> {
    const schedule = await this.findSchedule(id);

    await this.scheduleRepository.remove(schedule);

    await this.auditLogger.log({
      operationType: AuditOperationType.DELETE,
      resourceType: AuditResourceType.BACKUP_SCHEDULE,
      resourceId: id,
      description: `Backup schedule deleted`,
      metadata: { domainId: schedule.domainId },
    }, { userId: user.id });
  }

  // Internal methods for backup processor
  async createFullBackup(
    backupId: string,
    domainId: string,
    storageConfig: Record<string, unknown>,
    options: Record<string, unknown>,
    onProgress: (progress: number) => void,
  ): Promise<void> {
    const backup = await this.findOne(backupId);
    const domain = await this.domainRepository.findOne({
      where: { id: domainId },
      relations: ['systemUser'],
    });

    if (!domain || !domain.systemUser) {
      throw new Error('Domain or system user not found');
    }

    await this.backupRepository.update(backupId, { status: BackupStatus.IN_PROGRESS });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.tempDir, `${domain.name}-${timestamp}`);
    const archiveName = `${domain.name}-full-${timestamp}.tar.gz`;
    const archivePath = path.join(this.tempDir, archiveName);

    try {
      await fs.mkdir(backupDir, { recursive: true });
      onProgress(5);

      // Backup files
      if (options.includeFiles !== false) {
        const homeDir = domain.systemUser.homeDirectory;
        const filesBackupDir = path.join(backupDir, 'files');
        await fs.mkdir(filesBackupDir, { recursive: true });

        await this.commandExecutor.execute('cp', ['-a', homeDir, filesBackupDir]);
        onProgress(30);
      }

      // Backup databases
      if (options.includeDatabases !== false) {
        const dbBackupDir = path.join(backupDir, 'databases');
        await fs.mkdir(dbBackupDir, { recursive: true });

        // Get databases associated with domain
        const dbPrefix = domain.systemUser.username.replace(/-/g, '_');
        const dumpFile = path.join(dbBackupDir, `${dbPrefix}_databases.sql`);

        try {
          await this.commandExecutor.execute('mysqldump', [
            '--all-databases',
            '--single-transaction',
            `--result-file=${dumpFile}`,
            '--databases',
            `${dbPrefix}%`,
          ]);
        } catch {
          this.logger.warn('Database backup skipped - no databases found');
        }
        onProgress(60);
      }

      // Create archive
      await this.commandExecutor.execute('tar', [
        '-czf',
        archivePath,
        '-C',
        this.tempDir,
        `${domain.name}-${timestamp}`,
      ]);
      onProgress(80);

      // Get archive size
      const stats = await fs.stat(archivePath);

      // Upload to storage
      const storage = this.storageFactory.create(
        backup.storageType,
        storageConfig as Record<string, string>,
      );
      const remotePath = await storage.upload(
        archivePath,
        `${domain.name}/${archiveName}`,
      );
      onProgress(95);

      // Update backup record
      await this.backupRepository.update(backupId, {
        status: BackupStatus.COMPLETED,
        storagePath: remotePath,
        sizeBytes: stats.size,
        completedAt: new Date(),
        progress: 100,
        metadata: {
          compressionType: 'gzip',
          includedPaths: [domain.systemUser.homeDirectory],
        },
      });

      // Cleanup temp files
      await fs.rm(backupDir, { recursive: true, force: true });
      await fs.unlink(archivePath);

      onProgress(100);
    } catch (error) {
      await this.backupRepository.update(backupId, {
        status: BackupStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      // Cleanup on failure
      try {
        await fs.rm(backupDir, { recursive: true, force: true });
        await fs.unlink(archivePath);
      } catch {
        // Ignore cleanup errors
      }

      throw error;
    }
  }

  async createDatabaseBackup(
    backupId: string,
    domainId: string,
    storageConfig: Record<string, unknown>,
    onProgress: (progress: number) => void,
  ): Promise<void> {
    const backup = await this.findOne(backupId);
    const domain = await this.domainRepository.findOne({
      where: { id: domainId },
      relations: ['systemUser'],
    });

    if (!domain || !domain.systemUser) {
      throw new Error('Domain or system user not found');
    }

    await this.backupRepository.update(backupId, { status: BackupStatus.IN_PROGRESS });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dumpName = `${domain.name}-db-${timestamp}.sql.gz`;
    const dumpPath = path.join(this.tempDir, dumpName);

    try {
      await fs.mkdir(this.tempDir, { recursive: true });
      onProgress(10);

      const dbPrefix = domain.systemUser.username.replace(/-/g, '_');

      await this.commandExecutor.execute('bash', [
        '-c',
        `mysqldump --all-databases --single-transaction --databases "${dbPrefix}%" | gzip > "${dumpPath}"`,
      ]);
      onProgress(60);

      const stats = await fs.stat(dumpPath);

      const storage = this.storageFactory.create(
        backup.storageType,
        storageConfig as Record<string, string>,
      );
      const remotePath = await storage.upload(
        dumpPath,
        `${domain.name}/${dumpName}`,
      );
      onProgress(90);

      await this.backupRepository.update(backupId, {
        status: BackupStatus.COMPLETED,
        storagePath: remotePath,
        sizeBytes: stats.size,
        completedAt: new Date(),
        progress: 100,
        metadata: {
          compressionType: 'gzip',
          databasesCount: 1,
        },
      });

      await fs.unlink(dumpPath);
      onProgress(100);
    } catch (error) {
      await this.backupRepository.update(backupId, {
        status: BackupStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      try {
        await fs.unlink(dumpPath);
      } catch {
        // Ignore cleanup errors
      }

      throw error;
    }
  }

  async createFilesBackup(
    backupId: string,
    domainId: string,
    storageConfig: Record<string, unknown>,
    options: Record<string, unknown>,
    onProgress: (progress: number) => void,
  ): Promise<void> {
    const backup = await this.findOne(backupId);
    const domain = await this.domainRepository.findOne({
      where: { id: domainId },
      relations: ['systemUser'],
    });

    if (!domain || !domain.systemUser) {
      throw new Error('Domain or system user not found');
    }

    await this.backupRepository.update(backupId, { status: BackupStatus.IN_PROGRESS });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveName = `${domain.name}-files-${timestamp}.tar.gz`;
    const archivePath = path.join(this.tempDir, archiveName);

    try {
      await fs.mkdir(this.tempDir, { recursive: true });
      onProgress(10);

      const excludeArgs: string[] = [];
      const excludePaths = (options.excludePaths as string[]) || [];
      for (const exc of excludePaths) {
        excludeArgs.push('--exclude', exc);
      }

      await this.commandExecutor.execute('tar', [
        '-czf',
        archivePath,
        ...excludeArgs,
        '-C',
        path.dirname(domain.systemUser.homeDirectory),
        path.basename(domain.systemUser.homeDirectory),
      ]);
      onProgress(70);

      const stats = await fs.stat(archivePath);

      const storage = this.storageFactory.create(
        backup.storageType,
        storageConfig as Record<string, string>,
      );
      const remotePath = await storage.upload(
        archivePath,
        `${domain.name}/${archiveName}`,
      );
      onProgress(90);

      await this.backupRepository.update(backupId, {
        status: BackupStatus.COMPLETED,
        storagePath: remotePath,
        sizeBytes: stats.size,
        completedAt: new Date(),
        progress: 100,
        metadata: {
          compressionType: 'gzip',
          includedPaths: [domain.systemUser.homeDirectory],
          excludedPaths: excludePaths,
        },
      });

      await fs.unlink(archivePath);
      onProgress(100);
    } catch (error) {
      await this.backupRepository.update(backupId, {
        status: BackupStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      try {
        await fs.unlink(archivePath);
      } catch {
        // Ignore cleanup errors
      }

      throw error;
    }
  }

  async restoreBackup(
    backupId: string,
    options: {
      restoreFiles?: boolean;
      restoreDatabases?: boolean;
      specificPaths?: string[];
      specificDatabases?: string[];
    },
  ): Promise<void> {
    const backup = await this.findOne(backupId);
    const domain = await this.domainRepository.findOne({
      where: { id: backup.domainId },
      relations: ['systemUser'],
    });

    if (!domain || !domain.systemUser) {
      throw new Error('Domain or system user not found');
    }

    if (!backup.storagePath) {
      throw new Error('Backup file not found');
    }

    const storage = this.storageFactory.create(backup.storageType, {});
    const tempArchive = path.join(this.tempDir, `restore-${backup.id}.tar.gz`);
    const extractDir = path.join(this.tempDir, `restore-${backup.id}`);

    try {
      await fs.mkdir(this.tempDir, { recursive: true });

      // Download backup
      await storage.download(backup.storagePath, tempArchive);

      // Extract
      await fs.mkdir(extractDir, { recursive: true });
      await this.commandExecutor.execute('tar', ['-xzf', tempArchive, '-C', extractDir]);

      // Restore files
      if (options.restoreFiles !== false) {
        const filesDir = path.join(extractDir, 'files');
        try {
          await fs.access(filesDir);
          await this.commandExecutor.execute('rsync', [
            '-a',
            '--delete',
            `${filesDir}/`,
            domain.systemUser.homeDirectory,
          ]);
        } catch {
          this.logger.warn('No files directory in backup');
        }
      }

      // Restore databases
      if (options.restoreDatabases !== false) {
        const dbDir = path.join(extractDir, 'databases');
        try {
          const sqlFiles = await fs.readdir(dbDir);
          for (const sqlFile of sqlFiles) {
            if (sqlFile.endsWith('.sql')) {
              await this.commandExecutor.execute('mysql', [
                '-e',
                `source ${path.join(dbDir, sqlFile)}`,
              ]);
            }
          }
        } catch {
          this.logger.warn('No databases directory in backup');
        }
      }

      // Cleanup
      await fs.rm(extractDir, { recursive: true, force: true });
      await fs.unlink(tempArchive);
    } catch (error) {
      // Cleanup on failure
      try {
        await fs.rm(extractDir, { recursive: true, force: true });
        await fs.unlink(tempArchive);
      } catch {
        // Ignore cleanup errors
      }

      throw error;
    }
  }

  async applyRetention(scheduleId: string): Promise<void> {
    const schedule = await this.findSchedule(scheduleId);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - schedule.retentionDays);

    const oldBackups = await this.backupRepository.find({
      where: {
        scheduleId,
        createdAt: LessThan(cutoffDate),
        status: BackupStatus.COMPLETED,
      },
      order: { createdAt: 'ASC' },
    });

    for (const backup of oldBackups) {
      if (backup.storagePath) {
        try {
          const storage = this.storageFactory.create(backup.storageType, {});
          await storage.delete(backup.storagePath);
        } catch {
          this.logger.warn(`Failed to delete old backup file: ${backup.storagePath}`);
        }
      }
      await this.backupRepository.remove(backup);
    }

    // Also enforce max backups
    const allBackups = await this.backupRepository.find({
      where: { scheduleId, status: BackupStatus.COMPLETED },
      order: { createdAt: 'DESC' },
    });

    if (allBackups.length > schedule.maxBackups) {
      const toDelete = allBackups.slice(schedule.maxBackups);
      for (const backup of toDelete) {
        if (backup.storagePath) {
          try {
            const storage = this.storageFactory.create(backup.storageType, {});
            await storage.delete(backup.storagePath);
          } catch {
            this.logger.warn(`Failed to delete excess backup: ${backup.storagePath}`);
          }
        }
        await this.backupRepository.remove(backup);
      }
    }
  }

  async updateProgress(backupId: string, progress: number): Promise<void> {
    await this.backupRepository.update(backupId, { progress });
  }

  private isValidCronExpression(expr: string): boolean {
    const parts = expr.split(' ');
    return parts.length === 5 || parts.length === 6;
  }

  private calculateNextRun(_cronExpr: string): Date {
    // Simple implementation - in production use a cron parser library
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    now.setSeconds(0);
    now.setMilliseconds(0);
    return now;
  }
}
