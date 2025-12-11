import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { User } from '../../users/entities/user.entity.js';

export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR',
}

@Entity('terminal_sessions')
@Index(['userId'])
@Index(['status'])
@Index(['createdAt'])
export class TerminalSession extends BaseEntity {
  @Column({ type: 'varchar', length: 64, unique: true })
  sessionId!: string;

  @Column({ type: 'varchar', length: 64 })
  username!: string;

  @Column({ type: 'varchar', length: 45 })
  clientIp!: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  userAgent?: string;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.ACTIVE,
  })
  status!: SessionStatus;

  @Column({ type: 'int', default: 80 })
  cols!: number;

  @Column({ type: 'int', default: 24 })
  rows!: number;

  @Column({ type: 'varchar', length: 512, nullable: true })
  homeDirectory?: string;

  @Column({ type: 'timestamp', nullable: true })
  lastActivityAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  endReason?: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  isActive(): boolean {
    return this.status === SessionStatus.ACTIVE;
  }

  getIdleTimeSeconds(): number {
    if (!this.lastActivityAt) return 0;
    return Math.floor((Date.now() - this.lastActivityAt.getTime()) / 1000);
  }
}
