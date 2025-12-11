import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { Domain } from '../../domains/entities/domain.entity.js';

export enum AppType {
  NODEJS = 'NODEJS',
  PHP = 'PHP',
  STATIC = 'STATIC',
  PYTHON = 'PYTHON',
}

export enum AppStatus {
  PENDING = 'PENDING',
  DEPLOYING = 'DEPLOYING',
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED',
  ERROR = 'ERROR',
  CRASHED = 'CRASHED',
}

export enum NodeFramework {
  EXPRESS = 'EXPRESS',
  NESTJS = 'NESTJS',
  FASTIFY = 'FASTIFY',
  NEXTJS = 'NEXTJS',
  NUXTJS = 'NUXTJS',
  REMIX = 'REMIX',
  CUSTOM = 'CUSTOM',
}

export enum PhpFramework {
  LARAVEL = 'LARAVEL',
  SYMFONY = 'SYMFONY',
  WORDPRESS = 'WORDPRESS',
  DRUPAL = 'DRUPAL',
  CUSTOM = 'CUSTOM',
}

export interface Pm2Config {
  instances?: number | 'max';
  exec_mode?: 'fork' | 'cluster';
  max_memory_restart?: string;
  cron_restart?: string;
  watch?: boolean;
  ignore_watch?: string[];
  node_args?: string[];
  env?: Record<string, string>;
}

@Entity('apps')
@Index(['domainId'])
@Index(['status'])
@Index(['type'])
export class App extends BaseEntity {
  @Column({ length: 100 })
  name!: string;

  @Column({
    type: 'enum',
    enum: AppType,
    default: AppType.NODEJS,
  })
  type!: AppType;

  @Column({ length: 50, nullable: true })
  framework?: string;

  @Column({ length: 512 })
  path!: string;

  @Column({ name: 'entry_point', length: 255, default: 'index.js' })
  entryPoint!: string;

  @Column({ type: 'int', nullable: true })
  port?: number;

  @Column({
    type: 'enum',
    enum: AppStatus,
    default: AppStatus.PENDING,
  })
  status!: AppStatus;

  @Column({ name: 'pm2_process_id', nullable: true })
  pm2ProcessId?: string;

  @Column({ name: 'pm2_process_name', length: 100, nullable: true })
  pm2ProcessName?: string;

  @Column({ name: 'pm2_config', type: 'json', nullable: true })
  pm2Config?: Pm2Config;

  @Column({ name: 'node_version', length: 10, nullable: true })
  nodeVersion?: string;

  @Column({ name: 'php_version', length: 10, nullable: true })
  phpVersion?: string;

  @Column({ name: 'git_repository', length: 512, nullable: true })
  gitRepository?: string;

  @Column({ name: 'git_branch', length: 100, default: 'main' })
  gitBranch!: string;

  @Column({ name: 'build_command', length: 512, nullable: true })
  buildCommand?: string;

  @Column({ name: 'start_command', length: 512, nullable: true })
  startCommand?: string;

  @Column({ name: 'install_command', length: 512, default: 'npm install' })
  installCommand!: string;

  @Column({ name: 'auto_deploy', default: false })
  autoDeploy!: boolean;

  @Column({ name: 'last_deployed_at', type: 'timestamp', nullable: true })
  lastDeployedAt?: Date;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError?: string;

  @Column({ name: 'domain_id' })
  domainId!: string;

  @ManyToOne(() => Domain, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'domain_id' })
  domain!: Domain;

  isNodeApp(): boolean {
    return this.type === AppType.NODEJS;
  }

  isPhpApp(): boolean {
    return this.type === AppType.PHP;
  }

  isRunning(): boolean {
    return this.status === AppStatus.RUNNING;
  }

  getEcosystemFileName(): string {
    return `ecosystem.${this.pm2ProcessName || this.name}.config.js`;
  }
}
