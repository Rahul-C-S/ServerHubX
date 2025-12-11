import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BackupsService } from '../backups.service';
import { BackupType } from '../entities/backup.entity';

interface CreateBackupJobData {
  backupId: string;
  domainId: string;
  type: BackupType;
  storageType: string;
  storageConfig: Record<string, unknown>;
  options: Record<string, unknown>;
}

interface RestoreBackupJobData {
  backupId: string;
  restoreFiles: boolean;
  restoreDatabases: boolean;
  restoreMail: boolean;
  specificPaths?: string[];
  specificDatabases?: string[];
}

@Processor('backup')
export class BackupProcessor extends WorkerHost {
  private readonly logger = new Logger(BackupProcessor.name);

  constructor(private backupsService: BackupsService) {
    super();
  }

  async process(job: Job<CreateBackupJobData | RestoreBackupJobData>): Promise<void> {
    this.logger.log(`Processing backup job ${job.id}: ${job.name}`);

    switch (job.name) {
      case 'create-backup':
        await this.processCreateBackup(job as Job<CreateBackupJobData>);
        break;
      case 'restore-backup':
        await this.processRestoreBackup(job as Job<RestoreBackupJobData>);
        break;
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  }

  private async processCreateBackup(job: Job<CreateBackupJobData>): Promise<void> {
    const { backupId, domainId, type, storageConfig, options } = job.data;

    const onProgress = async (progress: number) => {
      await job.updateProgress(progress);
      await this.backupsService.updateProgress(backupId, progress);
    };

    try {
      switch (type) {
        case BackupType.FULL:
          await this.backupsService.createFullBackup(
            backupId,
            domainId,
            storageConfig,
            options,
            onProgress,
          );
          break;
        case BackupType.DATABASE:
          await this.backupsService.createDatabaseBackup(
            backupId,
            domainId,
            storageConfig,
            onProgress,
          );
          break;
        case BackupType.FILES:
          await this.backupsService.createFilesBackup(
            backupId,
            domainId,
            storageConfig,
            options,
            onProgress,
          );
          break;
        default:
          throw new Error(`Unknown backup type: ${type}`);
      }

      this.logger.log(`Backup ${backupId} completed successfully`);
    } catch (error) {
      this.logger.error(`Backup ${backupId} failed: ${error}`);
      throw error;
    }
  }

  private async processRestoreBackup(job: Job<RestoreBackupJobData>): Promise<void> {
    const { backupId, restoreFiles, restoreDatabases, specificPaths, specificDatabases } = job.data;

    try {
      await this.backupsService.restoreBackup(backupId, {
        restoreFiles,
        restoreDatabases,
        specificPaths,
        specificDatabases,
      });

      this.logger.log(`Restore from backup ${backupId} completed successfully`);
    } catch (error) {
      this.logger.error(`Restore from backup ${backupId} failed: ${error}`);
      throw error;
    }
  }
}
