import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum FirewallRuleType {
  PORT_ALLOW = 'PORT_ALLOW',
  PORT_DENY = 'PORT_DENY',
  IP_ALLOW = 'IP_ALLOW',
  IP_DENY = 'IP_DENY',
  IP_TEMP_BLOCK = 'IP_TEMP_BLOCK',
}

export enum FirewallProtocol {
  TCP = 'TCP',
  UDP = 'UDP',
  BOTH = 'BOTH',
}

export enum FirewallDirection {
  IN = 'IN',
  OUT = 'OUT',
  BOTH = 'BOTH',
}

@Entity('firewall_rules')
export class FirewallRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: FirewallRuleType })
  type!: FirewallRuleType;

  @Column({ nullable: true })
  port?: number;

  @Column({ type: 'enum', enum: FirewallProtocol, default: FirewallProtocol.TCP })
  protocol!: FirewallProtocol;

  @Column({ type: 'enum', enum: FirewallDirection, default: FirewallDirection.IN })
  direction!: FirewallDirection;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  comment?: string;

  @Column({ default: true })
  enabled!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
