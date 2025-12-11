import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

export enum AuditOperationType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_RESET = 'PASSWORD_RESET',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SYSTEM_COMMAND = 'SYSTEM_COMMAND',
  CONFIG_CHANGE = 'CONFIG_CHANGE',
  BACKUP = 'BACKUP',
  RESTORE = 'RESTORE',
  SSL_REQUEST = 'SSL_REQUEST',
  SSL_RENEWAL = 'SSL_RENEWAL',
  SERVICE_START = 'SERVICE_START',
  SERVICE_STOP = 'SERVICE_STOP',
  SERVICE_RESTART = 'SERVICE_RESTART',
  FIREWALL_CHANGE = 'FIREWALL_CHANGE',
}

export enum AuditResourceType {
  USER = 'USER',
  DOMAIN = 'DOMAIN',
  DATABASE = 'DATABASE',
  APP = 'APP',
  DNS_ZONE = 'DNS_ZONE',
  DNS_RECORD = 'DNS_RECORD',
  SSL_CERTIFICATE = 'SSL_CERTIFICATE',
  MAIL_DOMAIN = 'MAIL_DOMAIN',
  MAILBOX = 'MAILBOX',
  MAIL_ALIAS = 'MAIL_ALIAS',
  BACKUP = 'BACKUP',
  CRON_JOB = 'CRON_JOB',
  SERVICE = 'SERVICE',
  FIREWALL = 'FIREWALL',
  SYSTEM = 'SYSTEM',
}

export enum AuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

@Entity('audit_logs')
@Index(['userId', 'createdAt'])
@Index(['operationType', 'createdAt'])
@Index(['resourceType', 'resourceId'])
@Index(['severity', 'createdAt'])
export class AuditLog extends BaseEntity {
  @Column({
    type: 'enum',
    enum: AuditOperationType,
  })
  @Index()
  operationType!: AuditOperationType;

  @Column({
    type: 'enum',
    enum: AuditResourceType,
    nullable: true,
  })
  resourceType?: AuditResourceType;

  @Column({ nullable: true })
  resourceId?: string;

  @Column({ nullable: true })
  resourceName?: string;

  @Column({ nullable: true })
  @Index()
  userId?: string;

  @Column({ nullable: true })
  userEmail?: string;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'json', nullable: true })
  oldValue?: Record<string, unknown>;

  @Column({ type: 'json', nullable: true })
  newValue?: Record<string, unknown>;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ default: true })
  success!: boolean;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({
    type: 'enum',
    enum: AuditSeverity,
    default: AuditSeverity.INFO,
  })
  severity!: AuditSeverity;

  @Column({ nullable: true })
  duration?: number; // in milliseconds

  @Column({ nullable: true })
  transactionId?: string;
}
