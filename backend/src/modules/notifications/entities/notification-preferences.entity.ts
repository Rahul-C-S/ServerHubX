import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('notification_preferences')
export class NotificationPreferences {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Channel toggles
  @Column({ default: true })
  emailEnabled!: boolean;

  @Column({ default: false })
  smsEnabled!: boolean;

  @Column({ default: false })
  fcmEnabled!: boolean;

  @Column({ default: false })
  whatsappEnabled!: boolean;

  @Column({ default: false })
  webhookEnabled!: boolean;

  // Email config
  @Column({ type: 'json', nullable: true })
  emailConfig?: {
    address?: string;
    digestMode?: boolean;
    digestFrequency?: 'hourly' | 'daily' | 'weekly';
  };

  // SMS config
  @Column({ type: 'json', nullable: true })
  smsConfig?: {
    phoneNumber?: string;
    countryCode?: string;
  };

  // FCM config
  @Column({ type: 'json', nullable: true })
  fcmConfig?: {
    deviceTokens?: string[];
  };

  // WhatsApp config
  @Column({ type: 'json', nullable: true })
  whatsappConfig?: {
    phoneNumber?: string;
    countryCode?: string;
  };

  // Webhook config
  @Column({ type: 'json', nullable: true })
  webhookConfig?: {
    url?: string;
    secret?: string;
    headers?: Record<string, string>;
    format?: 'json' | 'slack' | 'discord';
  };

  // Schedule preferences
  @Column({ type: 'json', nullable: true })
  schedulePreferences?: {
    quietHoursEnabled?: boolean;
    quietHoursStart?: string; // HH:MM format
    quietHoursEnd?: string;
    quietHoursTimezone?: string;
    quietHoursSeverityOverride?: string[]; // critical alerts still sent
  };

  // Alert severity filters
  @Column({ type: 'json', nullable: true })
  severityFilters?: {
    info?: boolean;
    warning?: boolean;
    critical?: boolean;
  };

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
