import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { Domain } from '../../domains/entities/domain.entity.js';
import * as crypto from 'crypto';

export enum CertificateType {
  LETS_ENCRYPT = 'LETS_ENCRYPT',
  CUSTOM = 'CUSTOM',
  SELF_SIGNED = 'SELF_SIGNED',
}

export enum CertificateStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
  FAILED = 'FAILED',
}

@Entity('certificates')
@Index(['domainId'])
@Index(['expiresAt'])
@Index(['status'])
export class Certificate extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  commonName!: string;

  @Column({ type: 'simple-array', nullable: true })
  altNames?: string[];

  @Column({
    type: 'enum',
    enum: CertificateType,
    default: CertificateType.LETS_ENCRYPT,
  })
  type!: CertificateType;

  @Column({
    type: 'enum',
    enum: CertificateStatus,
    default: CertificateStatus.PENDING,
  })
  status!: CertificateStatus;

  @Column({ type: 'text', nullable: true })
  certificate?: string;

  @Column({ type: 'text', nullable: true })
  encryptedPrivateKey?: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  privateKeyIv?: string;

  @Column({ type: 'text', nullable: true })
  chain?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  issuedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'boolean', default: true })
  autoRenew!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastRenewalAttempt?: Date;

  @Column({ type: 'text', nullable: true })
  lastError?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  issuer?: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  serialNumber?: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  fingerprint?: string;

  @Column({ type: 'uuid' })
  domainId!: string;

  @ManyToOne(() => Domain, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'domainId' })
  domain!: Domain;

  // Encryption key derived from environment variable
  private static getEncryptionKey(): Buffer {
    const key = process.env.CERTIFICATE_ENCRYPTION_KEY || 'default-32-char-encryption-key!!';
    return crypto.scryptSync(key, 'salt', 32);
  }

  encryptPrivateKey(privateKey: string): void {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Certificate.getEncryptionKey(), iv);
    let encrypted = cipher.update(privateKey, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    this.encryptedPrivateKey = encrypted;
    this.privateKeyIv = iv.toString('hex');
  }

  decryptPrivateKey(): string | null {
    if (!this.encryptedPrivateKey || !this.privateKeyIv) {
      return null;
    }
    const iv = Buffer.from(this.privateKeyIv, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Certificate.getEncryptionKey(), iv);
    let decrypted = decipher.update(this.encryptedPrivateKey, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  isExpiringSoon(days: number = 30): boolean {
    if (!this.expiresAt) return false;
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + days);
    return this.expiresAt <= threshold;
  }

  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return this.expiresAt <= new Date();
  }

  getDaysUntilExpiry(): number | null {
    if (!this.expiresAt) return null;
    const now = new Date();
    const diff = this.expiresAt.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}
