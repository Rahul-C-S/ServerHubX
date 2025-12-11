import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { SystemUser } from '../../system-users/entities/system-user.entity.js';

export enum DomainStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
  ERROR = 'ERROR',
}

export enum WebServer {
  APACHE = 'APACHE',
  NGINX = 'NGINX',
}

export enum RuntimeType {
  PHP = 'PHP',
  NODEJS = 'NODEJS',
  STATIC = 'STATIC',
}

@Entity('domains')
@Index(['name'], { unique: true })
@Index(['ownerId'])
@Index(['systemUserId'])
@Index(['status'])
export class Domain extends BaseEntity {
  @Column({ length: 253, unique: true })
  name!: string;

  @Column({
    type: 'enum',
    enum: DomainStatus,
    default: DomainStatus.PENDING,
  })
  status!: DomainStatus;

  @Column({ name: 'document_root', length: 512 })
  documentRoot!: string;

  @Column({
    name: 'web_server',
    type: 'enum',
    enum: WebServer,
    default: WebServer.APACHE,
  })
  webServer!: WebServer;

  @Column({
    name: 'runtime_type',
    type: 'enum',
    enum: RuntimeType,
    default: RuntimeType.PHP,
  })
  runtimeType!: RuntimeType;

  @Column({ name: 'php_version', length: 10, nullable: true })
  phpVersion?: string;

  @Column({ name: 'node_version', length: 10, nullable: true })
  nodeVersion?: string;

  @Column({ name: 'ssl_enabled', default: false })
  sslEnabled!: boolean;

  @Column({ name: 'force_https', default: false })
  forceHttps!: boolean;

  @Column({ name: 'ssl_certificate_id', nullable: true })
  sslCertificateId?: string;

  @Column({ name: 'www_redirect', default: true })
  wwwRedirect!: boolean;

  @Column({ name: 'custom_error_pages', type: 'json', nullable: true })
  customErrorPages?: Record<string, string>;

  @Column({ name: 'extra_apache_config', type: 'text', nullable: true })
  extraApacheConfig?: string;

  @Column({ name: 'owner_id' })
  ownerId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner!: User;

  @Column({ name: 'system_user_id' })
  systemUserId!: string;

  @OneToOne(() => SystemUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'system_user_id' })
  systemUser!: SystemUser;

  @Column({ name: 'disk_usage_mb', type: 'bigint', default: 0 })
  diskUsageMb!: number;

  @Column({ name: 'bandwidth_used_mb', type: 'bigint', default: 0 })
  bandwidthUsedMb!: number;

  @Column({ name: 'last_accessed_at', type: 'timestamp', nullable: true })
  lastAccessedAt?: Date;

  getFullUrl(): string {
    const protocol = this.sslEnabled ? 'https' : 'http';
    return `${protocol}://${this.name}`;
  }

  isSecure(): boolean {
    return this.sslEnabled && this.forceHttps;
  }
}
