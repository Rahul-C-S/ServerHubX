import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { MailDomain } from './mail-domain.entity.js';
import * as bcrypt from 'bcrypt';

@Entity('mailboxes')
@Index(['mailDomainId', 'localPart'], { unique: true })
@Index(['email'], { unique: true })
export class Mailbox extends BaseEntity {
  @Column({ type: 'varchar', length: 64 })
  localPart!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  displayName?: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'bigint', default: 1073741824 }) // 1GB default
  quotaBytes!: number;

  @Column({ type: 'bigint', default: 0 })
  usedBytes!: number;

  @Column({ type: 'boolean', default: false })
  forwardingEnabled!: boolean;

  @Column({ type: 'simple-array', nullable: true })
  forwardingAddresses!: string[];

  @Column({ type: 'boolean', default: true })
  keepLocalCopy!: boolean;

  @Column({ type: 'boolean', default: false })
  autoReplyEnabled!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  autoReplySubject?: string;

  @Column({ type: 'text', nullable: true })
  autoReplyMessage?: string;

  @Column({ type: 'timestamp', nullable: true })
  autoReplyStartDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  autoReplyEndDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({ type: 'uuid' })
  mailDomainId!: string;

  @ManyToOne(() => MailDomain, (domain) => domain.mailboxes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mailDomainId' })
  mailDomain!: MailDomain;

  @BeforeInsert()
  generateEmail() {
    if (!this.email && this.localPart && this.mailDomain) {
      this.email = `${this.localPart}@${this.mailDomain.domainName}`;
    }
  }

  async setPassword(plainPassword: string): Promise<void> {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(plainPassword, salt);
  }

  async validatePassword(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.passwordHash);
  }

  getQuotaUsagePercent(): number {
    if (this.quotaBytes === 0) return 0;
    return Math.round((this.usedBytes / this.quotaBytes) * 100);
  }

  isOverQuota(): boolean {
    if (this.quotaBytes === 0) return false;
    return this.usedBytes >= this.quotaBytes;
  }

  isAutoReplyActive(): boolean {
    if (!this.autoReplyEnabled || !this.autoReplyMessage) return false;
    const now = new Date();
    if (this.autoReplyStartDate && now < this.autoReplyStartDate) return false;
    if (this.autoReplyEndDate && now > this.autoReplyEndDate) return false;
    return true;
  }
}
