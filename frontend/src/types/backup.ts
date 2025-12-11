export type BackupStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type BackupType = 'FULL' | 'DATABASE' | 'FILES' | 'CONFIG';
export type StorageType = 'LOCAL' | 'S3' | 'SFTP';

export interface Backup {
  id: string;
  domainId?: string;
  databaseId?: string;
  appId?: string;
  type: BackupType;
  status: BackupStatus;
  storageType: StorageType;
  storagePath: string;
  sizeBytes: number;
  checksum?: string;
  retentionDays: number;
  expiresAt?: string;
  completedAt?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  domain?: {
    id: string;
    name: string;
  };
  database?: {
    id: string;
    name: string;
  };
  app?: {
    id: string;
    name: string;
  };
}

export interface BackupSchedule {
  id: string;
  name: string;
  domainId?: string;
  backupType: BackupType;
  cronExpression: string;
  storageType: StorageType;
  storageConfig?: Record<string, unknown>;
  retentionDays: number;
  maxBackups: number;
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
  domain?: {
    id: string;
    name: string;
  };
}

export interface CreateBackupDto {
  domainId?: string;
  databaseId?: string;
  appId?: string;
  type: BackupType;
  storageType?: StorageType;
  storagePath?: string;
  retentionDays?: number;
}

export interface CreateBackupScheduleDto {
  name: string;
  domainId?: string;
  backupType: BackupType;
  cronExpression: string;
  storageType?: StorageType;
  storageConfig?: Record<string, unknown>;
  retentionDays?: number;
  maxBackups?: number;
  enabled?: boolean;
}

export interface UpdateBackupScheduleDto {
  name?: string;
  cronExpression?: string;
  storageType?: StorageType;
  storageConfig?: Record<string, unknown>;
  retentionDays?: number;
  maxBackups?: number;
  enabled?: boolean;
}
