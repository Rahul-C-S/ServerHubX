import {
  Entity,
  Column,
  Index,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { Domain } from '../../domains/entities/domain.entity.js';
import { DnsRecord } from './dns-record.entity.js';

export enum ZoneStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  ERROR = 'ERROR',
  DISABLED = 'DISABLED',
}

@Entity('dns_zones')
@Index(['zoneName'], { unique: true })
@Index(['domainId'])
@Index(['status'])
export class DnsZone extends BaseEntity {
  @Column({ name: 'zone_name', length: 253, unique: true })
  zoneName!: string;

  @Column({ type: 'bigint', default: 1 })
  serial!: number;

  @Column({ type: 'int', default: 86400 })
  ttl!: number;

  @Column({ name: 'primary_ns', length: 253, default: 'ns1.example.com.' })
  primaryNs!: string;

  @Column({ name: 'admin_email', length: 253, default: 'admin.example.com.' })
  adminEmail!: string;

  // SOA Fields
  @Column({ name: 'soa_refresh', type: 'int', default: 7200 })
  soaRefresh!: number;

  @Column({ name: 'soa_retry', type: 'int', default: 3600 })
  soaRetry!: number;

  @Column({ name: 'soa_expire', type: 'int', default: 1209600 })
  soaExpire!: number;

  @Column({ name: 'soa_minimum', type: 'int', default: 86400 })
  soaMinimum!: number;

  @Column({
    type: 'enum',
    enum: ZoneStatus,
    default: ZoneStatus.PENDING,
  })
  status!: ZoneStatus;

  @Column({ name: 'last_checked_at', type: 'timestamp', nullable: true })
  lastCheckedAt?: Date;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError?: string;

  @Column({ name: 'domain_id', nullable: true })
  domainId?: string;

  @OneToOne(() => Domain, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'domain_id' })
  domain?: Domain;

  @OneToMany(() => DnsRecord, (record) => record.zone)
  records!: DnsRecord[];

  generateSerial(): number {
    // YYYYMMDDNN format
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const currentSerial = this.serial.toString();

    if (currentSerial.startsWith(dateStr)) {
      // Increment the last two digits
      const nn = parseInt(currentSerial.slice(-2)) + 1;
      return parseInt(`${dateStr}${nn.toString().padStart(2, '0')}`);
    }

    return parseInt(`${dateStr}01`);
  }

  getAdminEmailFormatted(): string {
    // Convert admin.example.com. to admin@example.com
    const parts = this.adminEmail.replace(/\.$/, '').split('.');
    if (parts.length >= 2) {
      const user = parts[0];
      const domain = parts.slice(1).join('.');
      return `${user}@${domain}`;
    }
    return this.adminEmail;
  }
}
