import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { Domain } from '../../domains/entities/domain.entity.js';
import { Mailbox } from './mailbox.entity.js';
import { MailAlias } from './mail-alias.entity.js';
import * as crypto from 'crypto';

export enum MailDomainStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  DISABLED = 'DISABLED',
  ERROR = 'ERROR',
}

@Entity('mail_domains')
@Index(['domainId'], { unique: true })
@Index(['status'])
export class MailDomain extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  @Index({ unique: true })
  domainName!: string;

  @Column({
    type: 'enum',
    enum: MailDomainStatus,
    default: MailDomainStatus.PENDING,
  })
  status!: MailDomainStatus;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Column({ type: 'boolean', default: false })
  catchAllEnabled!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  catchAllAddress?: string;

  @Column({ type: 'bigint', default: 1073741824 }) // 1GB default
  defaultQuotaBytes!: number;

  @Column({ type: 'int', default: 0 })
  maxMailboxes!: number; // 0 = unlimited

  @Column({ type: 'int', default: 0 })
  maxAliases!: number; // 0 = unlimited

  @Column({ type: 'boolean', default: true })
  spamFilterEnabled!: boolean;

  @Column({ type: 'boolean', default: true })
  virusScanEnabled!: boolean;

  @Column({ type: 'boolean', default: false })
  dkimEnabled!: boolean;

  @Column({ type: 'text', nullable: true })
  dkimPublicKey?: string;

  @Column({ type: 'text', nullable: true })
  dkimPrivateKey?: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  dkimSelector?: string;

  @Column({ type: 'uuid' })
  domainId!: string;

  @ManyToOne(() => Domain, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'domainId' })
  domain!: Domain;

  @OneToMany(() => Mailbox, (mailbox) => mailbox.mailDomain)
  mailboxes?: Mailbox[];

  @OneToMany(() => MailAlias, (alias) => alias.mailDomain)
  aliases?: MailAlias[];

  getMailboxCount(): number {
    return this.mailboxes?.length || 0;
  }

  getAliasCount(): number {
    return this.aliases?.length || 0;
  }

  canAddMailbox(): boolean {
    if (this.maxMailboxes === 0) return true;
    return this.getMailboxCount() < this.maxMailboxes;
  }

  canAddAlias(): boolean {
    if (this.maxAliases === 0) return true;
    return this.getAliasCount() < this.maxAliases;
  }

  async generateDkimKeys(): Promise<void> {
    return new Promise((resolve, reject) => {
      crypto.generateKeyPair(
        'rsa',
        {
          modulusLength: 2048,
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        },
        (err, publicKey, privateKey) => {
          if (err) {
            reject(err);
            return;
          }
          this.dkimPublicKey = publicKey;
          this.dkimPrivateKey = privateKey;
          this.dkimSelector = `default${Date.now()}`;
          this.dkimEnabled = true;
          resolve();
        },
      );
    });
  }
}
