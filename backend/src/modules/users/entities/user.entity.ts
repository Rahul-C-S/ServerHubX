import { Entity, Column, Index, BeforeInsert, BeforeUpdate } from 'typeorm';
import * as argon2 from 'argon2';
import { BaseEntity } from '../../../common/entities/base.entity.js';

export enum UserRole {
  ROOT_ADMIN = 'ROOT_ADMIN',
  RESELLER = 'RESELLER',
  DOMAIN_OWNER = 'DOMAIN_OWNER',
  DEVELOPER = 'DEVELOPER',
}

@Entity('users')
@Index(['email'], { unique: true })
@Index(['role'])
@Index(['parentResellerId'])
export class User extends BaseEntity {
  @Column({ length: 255, unique: true })
  email!: string;

  @Column({ length: 255, select: false })
  password!: string;

  @Column({ name: 'first_name', length: 100 })
  firstName!: string;

  @Column({ name: 'last_name', length: 100 })
  lastName!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.DOMAIN_OWNER,
  })
  role!: UserRole;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'totp_secret', length: 255, nullable: true, select: false })
  totpSecret?: string;

  @Column({ name: 'totp_enabled', default: false })
  totpEnabled!: boolean;

  @Column({ name: 'backup_codes', type: 'json', nullable: true, select: false })
  backupCodes?: string[];

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({ name: 'failed_login_attempts', default: 0 })
  failedLoginAttempts!: number;

  @Column({ name: 'locked_until', type: 'timestamp', nullable: true })
  lockedUntil?: Date;

  @Column({ name: 'parent_reseller_id', nullable: true })
  parentResellerId?: string;

  @Column({ name: 'password_changed_at', type: 'timestamp', nullable: true })
  passwordChangedAt?: Date;

  private originalPassword?: string;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword(): Promise<void> {
    if (this.password && this.password !== this.originalPassword) {
      this.password = await argon2.hash(this.password, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      });
      this.passwordChangedAt = new Date();
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    try {
      return await argon2.verify(this.password, password);
    } catch {
      return false;
    }
  }

  isLocked(): boolean {
    if (!this.lockedUntil) {
      return false;
    }
    return new Date() < this.lockedUntil;
  }

  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
