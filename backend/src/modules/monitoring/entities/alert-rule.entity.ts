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
import { App } from '../../apps/entities/app.entity';
import { AlertInstance } from './alert-instance.entity';

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export enum AlertMetric {
  CPU_USAGE = 'cpu_usage',
  MEMORY_USAGE = 'memory_usage',
  DISK_USAGE = 'disk_usage',
  NETWORK_IN = 'network_in',
  NETWORK_OUT = 'network_out',
  SERVICE_STATUS = 'service_status',
  APP_STATUS = 'app_status',
  APP_MEMORY = 'app_memory',
  APP_CPU = 'app_cpu',
  APP_RESTARTS = 'app_restarts',
  SSL_EXPIRY = 'ssl_expiry',
  DB_CONNECTIONS = 'db_connections',
  DB_SLOW_QUERIES = 'db_slow_queries',
  MAIL_QUEUE = 'mail_queue',
  RESPONSE_TIME = 'response_time',
  ERROR_RATE = 'error_rate',
}

export enum AlertOperator {
  GREATER_THAN = 'gt',
  LESS_THAN = 'lt',
  EQUALS = 'eq',
  NOT_EQUALS = 'ne',
  GREATER_THAN_OR_EQUAL = 'gte',
  LESS_THAN_OR_EQUAL = 'lte',
}

export enum AlertScope {
  SYSTEM = 'system',
  DOMAIN = 'domain',
  APP = 'app',
  SERVICE = 'service',
}

@Entity('alert_rules')
export class AlertRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: AlertScope,
    default: AlertScope.SYSTEM,
  })
  scope!: AlertScope;

  @Column({
    type: 'enum',
    enum: AlertMetric,
  })
  metric!: AlertMetric;

  @Column({
    type: 'enum',
    enum: AlertSeverity,
    default: AlertSeverity.WARNING,
  })
  severity!: AlertSeverity;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  threshold!: number;

  @Column({
    type: 'enum',
    enum: AlertOperator,
    default: AlertOperator.GREATER_THAN,
  })
  operator!: AlertOperator;

  @Column({ type: 'int', default: 60 })
  durationSeconds!: number;

  @Column({ type: 'int', default: 300 })
  cooldownSeconds!: number;

  @Column({ default: true })
  enabled!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastTriggeredAt?: Date;

  @Column({ type: 'int', default: 0 })
  triggerCount!: number;

  @Column({ type: 'json', nullable: true })
  notificationOverrides?: {
    email?: boolean;
    sms?: boolean;
    fcm?: boolean;
    whatsapp?: boolean;
    webhook?: boolean;
    webhookUrl?: string;
  };

  @Column({ length: 100, nullable: true })
  serviceName?: string;

  @ManyToOne(() => Domain, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'domain_id' })
  domain?: Domain;

  @Column({ name: 'domain_id', nullable: true })
  domainId?: string;

  @ManyToOne(() => App, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'app_id' })
  app?: App;

  @Column({ name: 'app_id', nullable: true })
  appId?: string;

  @OneToMany(() => AlertInstance, (instance) => instance.rule)
  instances!: AlertInstance[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
