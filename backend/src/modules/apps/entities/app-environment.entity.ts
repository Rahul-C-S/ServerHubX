import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { App } from './app.entity.js';
import * as crypto from 'crypto';

@Entity('app_environments')
@Index(['appId', 'key'], { unique: true })
@Index(['appId'])
export class AppEnvironment extends BaseEntity {
  private static readonly ENCRYPTION_KEY = process.env.ENV_ENCRYPTION_KEY || 'default-encryption-key-change-me!';
  private static readonly ALGORITHM = 'aes-256-gcm';

  @Column({ length: 255 })
  key!: string;

  @Column({ type: 'text' })
  value!: string;

  @Column({ name: 'is_secret', default: false })
  isSecret!: boolean;

  @Column({ name: 'encrypted_value', type: 'text', nullable: true })
  encryptedValue?: string;

  @Column({ name: 'encryption_iv', length: 32, nullable: true })
  encryptionIv?: string;

  @Column({ name: 'encryption_tag', length: 32, nullable: true })
  encryptionTag?: string;

  @Column({ name: 'app_id' })
  appId!: string;

  @ManyToOne(() => App, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'app_id' })
  app!: App;

  @BeforeInsert()
  @BeforeUpdate()
  encryptIfSecret(): void {
    if (this.isSecret && this.value) {
      const encrypted = this.encrypt(this.value);
      this.encryptedValue = encrypted.encrypted;
      this.encryptionIv = encrypted.iv;
      this.encryptionTag = encrypted.tag;
      this.value = '***ENCRYPTED***';
    }
  }

  private encrypt(text: string): { encrypted: string; iv: string; tag: string } {
    const key = this.deriveKey(AppEnvironment.ENCRYPTION_KEY);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(AppEnvironment.ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
    };
  }

  decryptValue(): string {
    if (!this.isSecret || !this.encryptedValue || !this.encryptionIv || !this.encryptionTag) {
      return this.value;
    }

    const key = this.deriveKey(AppEnvironment.ENCRYPTION_KEY);
    const iv = Buffer.from(this.encryptionIv, 'hex');
    const tag = Buffer.from(this.encryptionTag, 'hex');

    const decipher = crypto.createDecipheriv(AppEnvironment.ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(this.encryptedValue, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private deriveKey(password: string): Buffer {
    return crypto.scryptSync(password, 'serverhubx-salt', 32);
  }

  getMaskedValue(): string {
    if (this.isSecret) {
      return '••••••••';
    }
    return this.value;
  }

  toEnvString(): string {
    const actualValue = this.isSecret ? this.decryptValue() : this.value;
    return `${this.key}=${actualValue}`;
  }
}
