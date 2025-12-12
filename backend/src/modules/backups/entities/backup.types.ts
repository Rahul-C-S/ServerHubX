export enum BackupType {
  FULL = 'full',
  FILES = 'files',
  DATABASE = 'database',
  INCREMENTAL = 'incremental',
}

export enum BackupStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum StorageType {
  LOCAL = 'local',
  S3 = 's3',
  SFTP = 'sftp',
}
