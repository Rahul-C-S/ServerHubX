import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Domain } from '../../domains/entities/domain.entity';
import { Backup, BackupType, StorageType } from './backup.entity';

@Entity('backup_schedules')
export class BackupSchedule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 100 })
  schedule!: string; // cron expression

  @Column({
    type: 'enum',
    enum: BackupType,
    default: BackupType.FULL,
  })
  type!: BackupType;

  @Column({
    type: 'enum',
    enum: StorageType,
    default: StorageType.LOCAL,
  })
  storageType!: StorageType;

  @Column({ type: 'int', default: 30 })
  retentionDays!: number;

  @Column({ type: 'int', default: 10 })
  maxBackups!: number;

  @Column({ default: true })
  enabled!: boolean;

  @Column({ type: 'json', nullable: true })
  storageConfig?: {
    // Local storage
    localPath?: string;
    // S3 storage
    s3Bucket?: string;
    s3Region?: string;
    s3AccessKey?: string;
    s3SecretKey?: string;
    s3Endpoint?: string;
    // SFTP storage
    sftpHost?: string;
    sftpPort?: number;
    sftpUsername?: string;
    sftpPassword?: string;
    sftpPrivateKey?: string;
    sftpPath?: string;
  };

  @Column({ type: 'json', nullable: true })
  options?: {
    includeDatabases?: boolean;
    includeFiles?: boolean;
    includeMail?: boolean;
    excludePaths?: string[];
    compressionLevel?: number;
    encryptBackup?: boolean;
    encryptionKey?: string;
    notifyOnComplete?: boolean;
    notifyOnFailure?: boolean;
  };

  @Column({ type: 'timestamp', nullable: true })
  lastRunAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextRunAt?: Date;

  @Column({ type: 'int', default: 0 })
  runCount!: number;

  @Column({ type: 'int', default: 0 })
  failureCount!: number;

  @ManyToOne(() => Domain, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'domain_id' })
  domain!: Domain;

  @Column({ name: 'domain_id' })
  domainId!: string;

  @OneToMany(() => Backup, (backup) => backup.schedule)
  backups!: Backup[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
