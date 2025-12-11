export type ZoneStatus = 'ACTIVE' | 'PENDING' | 'ERROR' | 'DISABLED';

export type DnsRecordType =
  | 'A'
  | 'AAAA'
  | 'CNAME'
  | 'MX'
  | 'TXT'
  | 'NS'
  | 'SRV'
  | 'CAA'
  | 'PTR'
  | 'SOA';

export interface DnsZone {
  id: string;
  zoneName: string;
  serial: number;
  ttl: number;
  primaryNs: string;
  adminEmail: string;
  soaRefresh: number;
  soaRetry: number;
  soaExpire: number;
  soaMinimum: number;
  status: ZoneStatus;
  lastCheckedAt?: string;
  lastError?: string;
  domainId?: string;
  domain?: {
    id: string;
    name: string;
  };
  records: DnsRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface DnsRecord {
  id: string;
  name: string;
  type: DnsRecordType;
  value: string;
  ttl: number;
  priority?: number;
  weight?: number;
  port?: number;
  flag?: string;
  tag?: string;
  zoneId: string;
  enabled: boolean;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateZoneDto {
  zoneName: string;
  ttl?: number;
  primaryNs?: string;
  adminEmail?: string;
  soaRefresh?: number;
  soaRetry?: number;
  soaExpire?: number;
  soaMinimum?: number;
  domainId?: string;
}

export interface UpdateZoneDto {
  ttl?: number;
  primaryNs?: string;
  adminEmail?: string;
  soaRefresh?: number;
  soaRetry?: number;
  soaExpire?: number;
  soaMinimum?: number;
}

export interface CreateRecordDto {
  name: string;
  type: DnsRecordType;
  value: string;
  ttl?: number;
  priority?: number;
  weight?: number;
  port?: number;
  flag?: string;
  tag?: string;
  enabled?: boolean;
  comment?: string;
}

export interface UpdateRecordDto {
  name?: string;
  value?: string;
  ttl?: number;
  priority?: number;
  weight?: number;
  port?: number;
  flag?: string;
  tag?: string;
  enabled?: boolean;
  comment?: string;
}
