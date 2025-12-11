import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AlertRule } from './alert-rule.entity';
import { User } from '../../users/entities/user.entity';

export enum AlertStatus {
  FIRING = 'firing',
  RESOLVED = 'resolved',
  ACKNOWLEDGED = 'acknowledged',
}

@Entity('alert_instances')
export class AlertInstance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: AlertStatus,
    default: AlertStatus.FIRING,
  })
  status!: AlertStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  value!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  threshold!: number;

  @Column({ type: 'timestamp' })
  firedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  acknowledgedAt?: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'acknowledged_by_id' })
  acknowledgedBy?: User;

  @Column({ name: 'acknowledged_by_id', nullable: true })
  acknowledgedById?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'json', nullable: true })
  notificationsSent?: {
    email?: { sentAt: Date; success: boolean };
    sms?: { sentAt: Date; success: boolean };
    fcm?: { sentAt: Date; success: boolean };
    whatsapp?: { sentAt: Date; success: boolean };
    webhook?: { sentAt: Date; success: boolean };
  };

  @Column({ type: 'json', nullable: true })
  context?: {
    hostname?: string;
    serviceName?: string;
    domainName?: string;
    appName?: string;
    additionalData?: Record<string, unknown>;
  };

  @ManyToOne(() => AlertRule, (rule) => rule.instances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rule_id' })
  rule!: AlertRule;

  @Column({ name: 'rule_id' })
  ruleId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
