import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { SystemUser } from './system-user.entity.js';

export enum SSHKeyType {
  RSA = 'RSA',
  ED25519 = 'ED25519',
  ECDSA = 'ECDSA',
  DSA = 'DSA',
}

@Entity('ssh_keys')
@Index(['systemUserId'])
@Index(['fingerprint'], { unique: true })
export class SSHKey extends BaseEntity {
  @Column({ length: 255 })
  name!: string;

  @Column({ name: 'public_key', type: 'text' })
  publicKey!: string;

  @Column({ length: 255 })
  fingerprint!: string;

  @Column({
    name: 'key_type',
    type: 'enum',
    enum: SSHKeyType,
    default: SSHKeyType.RSA,
  })
  keyType!: SSHKeyType;

  @Column({ name: 'key_bits', type: 'int', nullable: true })
  keyBits?: number;

  @Column({ name: 'system_user_id' })
  systemUserId!: string;

  @ManyToOne(() => SystemUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'system_user_id' })
  systemUser!: SystemUser;

  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt?: Date;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date;

  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }
}
