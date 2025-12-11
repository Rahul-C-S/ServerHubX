import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Domain } from '../../domains/entities/domain.entity';
import { BackupSchedule } from './backup-schedule.entity';

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

@Entity('backups')
export class Backup {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({
    type: 'enum',
    enum: BackupType,
    default: BackupType.FULL,
  })
  type!: BackupType;

  @Column({
    type: 'enum',
    enum: BackupStatus,
    default: BackupStatus.PENDING,
  })
  status!: BackupStatus;

  @Column({ type: 'bigint', default: 0 })
  sizeBytes!: number;

  @Column({ length: 500, nullable: true })
  storagePath?: string;

  @Column({
    type: 'enum',
    enum: StorageType,
    default: StorageType.LOCAL,
  })
  storageType!: StorageType;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'int', default: 0 })
  progress!: number;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ type: 'json', nullable: true })
  metadata?: {
    filesCount?: number;
    databasesCount?: number;
    includedPaths?: string[];
    excludedPaths?: string[];
    compressionType?: string;
    checksum?: string;
  };

  @ManyToOne(() => Domain, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'domain_id' })
  domain!: Domain;

  @Column({ name: 'domain_id' })
  domainId!: string;

  @ManyToOne(() => BackupSchedule, (schedule) => schedule.backups, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'schedule_id' })
  schedule?: BackupSchedule;

  @Column({ name: 'schedule_id', nullable: true })
  scheduleId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
