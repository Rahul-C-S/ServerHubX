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

@Entity('cron_jobs')
export class CronJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 100 })
  schedule!: string; // cron expression

  @Column({ type: 'text' })
  command!: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastRunAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextRunAt?: Date;

  @Column({ type: 'text', nullable: true })
  lastOutput?: string;

  @Column({ type: 'int', nullable: true })
  lastExitCode?: number;

  @Column({ type: 'int', default: 0 })
  runCount!: number;

  @Column({ type: 'int', default: 0 })
  failureCount!: number;

  @Column({ type: 'int', default: 300 })
  timeoutSeconds!: number;

  @Column({ default: false })
  notifyOnFailure!: boolean;

  @Column({ default: false })
  notifyOnSuccess!: boolean;

  @Column({ type: 'json', nullable: true })
  environment?: Record<string, string>;

  @ManyToOne(() => Domain, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'domain_id' })
  domain!: Domain;

  @Column({ name: 'domain_id' })
  domainId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
