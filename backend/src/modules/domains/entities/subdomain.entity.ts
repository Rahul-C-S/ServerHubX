import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { Domain, RuntimeType } from './domain.entity.js';

export enum SubdomainStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
}

@Entity('subdomains')
@Index(['name', 'domainId'], { unique: true })
@Index(['domainId'])
export class Subdomain extends BaseEntity {
  @Column({ length: 63 })
  name!: string;

  @Column({ name: 'full_name', length: 253 })
  fullName!: string;

  @Column({ name: 'document_root', length: 512 })
  documentRoot!: string;

  @Column({
    type: 'enum',
    enum: SubdomainStatus,
    default: SubdomainStatus.PENDING,
  })
  status!: SubdomainStatus;

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

  @Column({ name: 'is_wildcard', default: false })
  isWildcard!: boolean;

  @Column({ name: 'domain_id' })
  domainId!: string;

  @ManyToOne(() => Domain, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'domain_id' })
  domain!: Domain;

  @Column({ name: 'app_port', type: 'int', nullable: true })
  appPort?: number;

  getFullUrl(): string {
    const protocol = this.sslEnabled ? 'https' : 'http';
    return `${protocol}://${this.fullName}`;
  }
}
