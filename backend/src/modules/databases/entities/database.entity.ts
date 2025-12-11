import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { Domain } from '../../domains/entities/domain.entity.js';
import { DatabaseUser } from './database-user.entity.js';

export enum DatabaseType {
  MARIADB = 'MARIADB',
  MYSQL = 'MYSQL',
}

export enum DatabaseStatus {
  ACTIVE = 'ACTIVE',
  CREATING = 'CREATING',
  ERROR = 'ERROR',
  SUSPENDED = 'SUSPENDED',
}

@Entity('databases')
@Index(['name'], { unique: true })
@Index(['ownerId'])
@Index(['domainId'])
@Index(['status'])
export class Database extends BaseEntity {
  @Column({ length: 64, unique: true })
  name!: string;

  @Column({
    type: 'enum',
    enum: DatabaseType,
    default: DatabaseType.MARIADB,
  })
  type!: DatabaseType;

  @Column({
    type: 'enum',
    enum: DatabaseStatus,
    default: DatabaseStatus.CREATING,
  })
  status!: DatabaseStatus;

  @Column({ name: 'size_bytes', type: 'bigint', default: 0 })
  sizeBytes!: number;

  @Column({ length: 32, default: 'utf8mb4' })
  charset!: string;

  @Column({ length: 64, default: 'utf8mb4_unicode_ci' })
  collation!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'last_backup_at', type: 'timestamp', nullable: true })
  lastBackupAt?: Date;

  @Column({ name: 'table_count', type: 'int', default: 0 })
  tableCount!: number;

  @Column({ name: 'owner_id' })
  ownerId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner!: User;

  @Column({ name: 'domain_id', nullable: true })
  domainId?: string;

  @ManyToOne(() => Domain, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'domain_id' })
  domain?: Domain;

  @OneToMany(() => DatabaseUser, (dbUser) => dbUser.database)
  users!: DatabaseUser[];

  getSizeFormatted(): string {
    const bytes = Number(this.sizeBytes);
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }
}
