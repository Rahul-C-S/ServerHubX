import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { DnsZone } from './dns-zone.entity.js';

export enum DnsRecordType {
  A = 'A',
  AAAA = 'AAAA',
  CNAME = 'CNAME',
  MX = 'MX',
  TXT = 'TXT',
  NS = 'NS',
  SRV = 'SRV',
  CAA = 'CAA',
  PTR = 'PTR',
  SOA = 'SOA',
}

@Entity('dns_records')
@Index(['zoneId'])
@Index(['name', 'type', 'zoneId'])
export class DnsRecord extends BaseEntity {
  @Column({ length: 253 })
  name!: string;

  @Column({
    type: 'enum',
    enum: DnsRecordType,
  })
  type!: DnsRecordType;

  @Column({ type: 'text' })
  value!: string;

  @Column({ type: 'int', default: 3600 })
  ttl!: number;

  @Column({ type: 'int', nullable: true })
  priority?: number;

  // SRV record specific fields
  @Column({ type: 'int', nullable: true })
  weight?: number;

  @Column({ type: 'int', nullable: true })
  port?: number;

  // CAA record specific fields
  @Column({ length: 32, nullable: true })
  flag?: string;

  @Column({ length: 32, nullable: true })
  tag?: string;

  @Column({ name: 'zone_id' })
  zoneId!: string;

  @ManyToOne(() => DnsZone, (zone) => zone.records, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'zone_id' })
  zone!: DnsZone;

  @Column({ default: true })
  enabled!: boolean;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  toZoneFileFormat(): string {
    const nameField = this.name === '@' ? this.zone.zoneName : `${this.name}.${this.zone.zoneName}`;

    switch (this.type) {
      case DnsRecordType.A:
      case DnsRecordType.AAAA:
        return `${nameField}.\t${this.ttl}\tIN\t${this.type}\t${this.value}`;

      case DnsRecordType.CNAME:
      case DnsRecordType.NS:
      case DnsRecordType.PTR:
        const cnameValue = this.value.endsWith('.') ? this.value : `${this.value}.`;
        return `${nameField}.\t${this.ttl}\tIN\t${this.type}\t${cnameValue}`;

      case DnsRecordType.MX:
        const mxValue = this.value.endsWith('.') ? this.value : `${this.value}.`;
        return `${nameField}.\t${this.ttl}\tIN\tMX\t${this.priority || 10}\t${mxValue}`;

      case DnsRecordType.TXT:
        // TXT records need to be quoted and may be split if > 255 chars
        const txtValue = this.value.length > 255
          ? this.splitTxtValue(this.value)
          : `"${this.escapeText(this.value)}"`;
        return `${nameField}.\t${this.ttl}\tIN\tTXT\t${txtValue}`;

      case DnsRecordType.SRV:
        const srvTarget = this.value.endsWith('.') ? this.value : `${this.value}.`;
        return `${nameField}.\t${this.ttl}\tIN\tSRV\t${this.priority || 0}\t${this.weight || 0}\t${this.port || 0}\t${srvTarget}`;

      case DnsRecordType.CAA:
        return `${nameField}.\t${this.ttl}\tIN\tCAA\t${this.flag || '0'}\t${this.tag || 'issue'}\t"${this.value}"`;

      default:
        return `${nameField}.\t${this.ttl}\tIN\t${this.type}\t${this.value}`;
    }
  }

  private escapeText(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  private splitTxtValue(text: string): string {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += 255) {
      chunks.push(`"${this.escapeText(text.slice(i, i + 255))}"`);
    }
    return chunks.join(' ');
  }

  static validateValue(type: DnsRecordType, value: string): { valid: boolean; error?: string } {
    switch (type) {
      case DnsRecordType.A:
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipv4Regex.test(value)) {
          return { valid: false, error: 'Invalid IPv4 address' };
        }
        const parts = value.split('.').map(Number);
        if (parts.some((p) => p > 255)) {
          return { valid: false, error: 'Invalid IPv4 address' };
        }
        return { valid: true };

      case DnsRecordType.AAAA:
        const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(([0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4})?::(([0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4})?$/;
        if (!ipv6Regex.test(value)) {
          return { valid: false, error: 'Invalid IPv6 address' };
        }
        return { valid: true };

      case DnsRecordType.CNAME:
      case DnsRecordType.NS:
      case DnsRecordType.PTR:
        const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.?$/;
        if (!hostnameRegex.test(value)) {
          return { valid: false, error: 'Invalid hostname' };
        }
        return { valid: true };

      case DnsRecordType.MX:
        const mxRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.?$/;
        if (!mxRegex.test(value)) {
          return { valid: false, error: 'Invalid mail server hostname' };
        }
        return { valid: true };

      case DnsRecordType.TXT:
        if (value.length > 4096) {
          return { valid: false, error: 'TXT record value too long (max 4096 characters)' };
        }
        return { valid: true };

      case DnsRecordType.CAA:
        if (!value.match(/^[a-zA-Z0-9.-]+$/)) {
          return { valid: false, error: 'Invalid CAA value' };
        }
        return { valid: true };

      default:
        return { valid: true };
    }
  }
}
