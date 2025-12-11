import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

export enum SystemUserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
}

@Entity('system_users')
@Index(['username'], { unique: true })
@Index(['uid'], { unique: true })
@Index(['status'])
export class SystemUser extends BaseEntity {
  @Column({ length: 32, unique: true })
  username!: string;

  @Column({ type: 'int', unique: true })
  uid!: number;

  @Column({ type: 'int' })
  gid!: number;

  @Column({ name: 'home_directory', length: 255 })
  homeDirectory!: string;

  @Column({ length: 100, default: '/bin/bash' })
  shell!: string;

  @Column({
    type: 'enum',
    enum: SystemUserStatus,
    default: SystemUserStatus.ACTIVE,
  })
  status!: SystemUserStatus;

  @Column({ name: 'disk_quota_mb', type: 'bigint', default: 0 })
  diskQuotaMb!: number;

  @Column({ name: 'disk_used_mb', type: 'bigint', default: 0 })
  diskUsedMb!: number;

  @Column({ name: 'inode_quota', type: 'int', default: 0 })
  inodeQuota!: number;

  @Column({ name: 'inode_used', type: 'int', default: 0 })
  inodeUsed!: number;

  @Column({ name: 'ssh_enabled', default: true })
  sshEnabled!: boolean;

  @Column({ name: 'sftp_only', default: false })
  sftpOnly!: boolean;

  @Column({ name: 'owner_id', nullable: true })
  ownerId?: string;

  getDiskUsagePercent(): number {
    if (this.diskQuotaMb === 0) return 0;
    return Math.round((this.diskUsedMb / this.diskQuotaMb) * 100);
  }

  getInodeUsagePercent(): number {
    if (this.inodeQuota === 0) return 0;
    return Math.round((this.inodeUsed / this.inodeQuota) * 100);
  }

  isQuotaExceeded(): boolean {
    if (this.diskQuotaMb > 0 && this.diskUsedMb >= this.diskQuotaMb) {
      return true;
    }
    if (this.inodeQuota > 0 && this.inodeUsed >= this.inodeQuota) {
      return true;
    }
    return false;
  }
}
