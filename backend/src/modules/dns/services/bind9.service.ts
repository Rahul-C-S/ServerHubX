import { Injectable } from '@nestjs/common';
import { CommandExecutorService } from '../../../core/executor/command-executor.service.js';
import { PathResolverService } from '../../../core/distro/path-resolver.service.js';
import { LoggerService } from '../../../common/logger/logger.service.js';
import { DnsZone } from '../entities/dns-zone.entity.js';
import { DnsRecord, DnsRecordType } from '../entities/dns-record.entity.js';

@Injectable()
export class Bind9Service {
  constructor(
    private readonly commandExecutor: CommandExecutorService,
    private readonly pathResolver: PathResolverService,
    private readonly logger: LoggerService,
  ) {}

  generateZoneFile(zone: DnsZone, records: DnsRecord[]): string {
    const lines: string[] = [];

    // TTL directive
    lines.push(`$TTL ${zone.ttl}`);
    lines.push('');

    // SOA record
    lines.push(`@\tIN\tSOA\t${zone.primaryNs}\t${zone.adminEmail} (`);
    lines.push(`\t\t\t${zone.serial}\t; Serial`);
    lines.push(`\t\t\t${zone.soaRefresh}\t; Refresh`);
    lines.push(`\t\t\t${zone.soaRetry}\t; Retry`);
    lines.push(`\t\t\t${zone.soaExpire}\t; Expire`);
    lines.push(`\t\t\t${zone.soaMinimum}\t)\t; Negative Cache TTL`);
    lines.push('');

    // Group records by type for better readability
    const recordsByType = new Map<DnsRecordType, DnsRecord[]>();

    for (const record of records) {
      if (!record.enabled) continue;

      const typeRecords = recordsByType.get(record.type) || [];
      typeRecords.push(record);
      recordsByType.set(record.type, typeRecords);
    }

    // Write NS records first
    const nsRecords = recordsByType.get(DnsRecordType.NS);
    if (nsRecords && nsRecords.length > 0) {
      lines.push('; Name Servers');
      for (const record of nsRecords) {
        lines.push(this.formatRecord(record, zone.zoneName));
      }
      lines.push('');
      recordsByType.delete(DnsRecordType.NS);
    }

    // Write MX records
    const mxRecords = recordsByType.get(DnsRecordType.MX);
    if (mxRecords && mxRecords.length > 0) {
      lines.push('; Mail Servers');
      for (const record of mxRecords.sort((a, b) => (a.priority || 0) - (b.priority || 0))) {
        lines.push(this.formatRecord(record, zone.zoneName));
      }
      lines.push('');
      recordsByType.delete(DnsRecordType.MX);
    }

    // Write A records
    const aRecords = recordsByType.get(DnsRecordType.A);
    if (aRecords && aRecords.length > 0) {
      lines.push('; A Records');
      for (const record of aRecords) {
        lines.push(this.formatRecord(record, zone.zoneName));
      }
      lines.push('');
      recordsByType.delete(DnsRecordType.A);
    }

    // Write AAAA records
    const aaaaRecords = recordsByType.get(DnsRecordType.AAAA);
    if (aaaaRecords && aaaaRecords.length > 0) {
      lines.push('; AAAA Records');
      for (const record of aaaaRecords) {
        lines.push(this.formatRecord(record, zone.zoneName));
      }
      lines.push('');
      recordsByType.delete(DnsRecordType.AAAA);
    }

    // Write remaining records by type
    for (const [type, typeRecords] of recordsByType) {
      lines.push(`; ${type} Records`);
      for (const record of typeRecords) {
        lines.push(this.formatRecord(record, zone.zoneName));
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private formatRecord(record: DnsRecord, _zoneName: string): string {
    const name = record.name === '@' ? '@' : record.name;

    switch (record.type) {
      case DnsRecordType.A:
      case DnsRecordType.AAAA:
        return `${name}\t${record.ttl}\tIN\t${record.type}\t${record.value}`;

      case DnsRecordType.CNAME:
      case DnsRecordType.NS:
      case DnsRecordType.PTR:
        const cnameValue = record.value.endsWith('.') ? record.value : `${record.value}.`;
        return `${name}\t${record.ttl}\tIN\t${record.type}\t${cnameValue}`;

      case DnsRecordType.MX:
        const mxValue = record.value.endsWith('.') ? record.value : `${record.value}.`;
        return `${name}\t${record.ttl}\tIN\tMX\t${record.priority || 10}\t${mxValue}`;

      case DnsRecordType.TXT:
        const escapedValue = record.value.replace(/"/g, '\\"');
        return `${name}\t${record.ttl}\tIN\tTXT\t"${escapedValue}"`;

      case DnsRecordType.SRV:
        const srvTarget = record.value.endsWith('.') ? record.value : `${record.value}.`;
        return `${name}\t${record.ttl}\tIN\tSRV\t${record.priority || 0}\t${record.weight || 0}\t${record.port || 0}\t${srvTarget}`;

      case DnsRecordType.CAA:
        return `${name}\t${record.ttl}\tIN\tCAA\t${record.flag || '0'}\t${record.tag || 'issue'}\t"${record.value}"`;

      default:
        return `${name}\t${record.ttl}\tIN\t${record.type}\t${record.value}`;
    }
  }

  async writeZoneFile(zoneName: string, content: string): Promise<{ success: boolean; error?: string }> {
    const zonePath = this.getZonePath(zoneName);

    // Write using tee command for proper permissions
    const result = await this.commandExecutor.execute('tee', [zonePath], {
      stdin: content,
    });

    if (!result.success) {
      this.logger.error(`Failed to write zone file ${zonePath}: ${result.stderr}`, undefined, 'Bind9Service');
      return { success: false, error: result.stderr };
    }

    this.logger.log(`Wrote zone file: ${zonePath}`, 'Bind9Service');
    return { success: true };
  }

  async checkZone(zoneName: string): Promise<{ valid: boolean; error?: string }> {
    const zonePath = this.getZonePath(zoneName);

    const result = await this.commandExecutor.execute('named-checkzone', [zoneName, zonePath]);

    if (!result.success) {
      this.logger.warn(`Zone check failed for ${zoneName}: ${result.stderr}`, 'Bind9Service');
      return { valid: false, error: result.stderr };
    }

    return { valid: true };
  }

  async checkConfig(): Promise<{ valid: boolean; error?: string }> {
    const configPath = this.pathResolver.getBindNamedConfPath();

    const result = await this.commandExecutor.execute('named-checkconf', [configPath]);

    if (!result.success) {
      return { valid: false, error: result.stderr };
    }

    return { valid: true };
  }

  async reloadZone(zoneName: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.commandExecutor.execute('rndc', ['reload', zoneName]);

    if (!result.success) {
      this.logger.error(`Failed to reload zone ${zoneName}: ${result.stderr}`, undefined, 'Bind9Service');
      return { success: false, error: result.stderr };
    }

    this.logger.log(`Reloaded zone: ${zoneName}`, 'Bind9Service');
    return { success: true };
  }

  async reloadAll(): Promise<{ success: boolean; error?: string }> {
    const result = await this.commandExecutor.execute('rndc', ['reload']);

    if (!result.success) {
      return { success: false, error: result.stderr };
    }

    return { success: true };
  }

  async addZoneToConfig(zoneName: string): Promise<{ success: boolean; error?: string }> {
    const zonePath = this.getZonePath(zoneName);
    const zonesConfigPath = this.pathResolver.getBindNamedConfPath();

    // Zone configuration block
    const zoneConfig = `
zone "${zoneName}" {
    type master;
    file "${zonePath}";
    allow-transfer { none; };
    allow-update { none; };
};
`;

    // Append to zones config file
    const result = await this.commandExecutor.execute('tee', ['-a', zonesConfigPath], {
      stdin: zoneConfig,
    });

    if (!result.success) {
      return { success: false, error: result.stderr };
    }

    return { success: true };
  }

  async removeZoneFromConfig(zoneName: string): Promise<{ success: boolean; error?: string }> {
    // This is more complex - we need to edit the config file
    // For now, we'll use sed to remove the zone block
    const zonesConfigPath = this.pathResolver.getBindNamedConfPath();

    // Use sed to delete the zone block
    const result = await this.commandExecutor.execute('sed', [
      '-i',
      `/zone "${zoneName}"/,/^};$/d`,
      zonesConfigPath,
    ]);

    if (!result.success) {
      return { success: false, error: result.stderr };
    }

    return { success: true };
  }

  async deleteZoneFile(zoneName: string): Promise<{ success: boolean; error?: string }> {
    const zonePath = this.getZonePath(zoneName);

    const result = await this.commandExecutor.execute('rm', ['-f', zonePath]);

    if (!result.success) {
      return { success: false, error: result.stderr };
    }

    return { success: true };
  }

  generateDefaultRecords(zoneName: string, serverIp: string): Partial<DnsRecord>[] {
    const records: Partial<DnsRecord>[] = [];

    // NS records
    records.push({
      name: '@',
      type: DnsRecordType.NS,
      value: `ns1.${zoneName}.`,
      ttl: 86400,
    });
    records.push({
      name: '@',
      type: DnsRecordType.NS,
      value: `ns2.${zoneName}.`,
      ttl: 86400,
    });

    // A records for nameservers
    records.push({
      name: 'ns1',
      type: DnsRecordType.A,
      value: serverIp,
      ttl: 86400,
    });
    records.push({
      name: 'ns2',
      type: DnsRecordType.A,
      value: serverIp,
      ttl: 86400,
    });

    // Root A record
    records.push({
      name: '@',
      type: DnsRecordType.A,
      value: serverIp,
      ttl: 3600,
    });

    // WWW CNAME
    records.push({
      name: 'www',
      type: DnsRecordType.CNAME,
      value: zoneName,
      ttl: 3600,
    });

    // Mail record
    records.push({
      name: '@',
      type: DnsRecordType.MX,
      value: `mail.${zoneName}.`,
      ttl: 3600,
      priority: 10,
    });

    // Mail server A record
    records.push({
      name: 'mail',
      type: DnsRecordType.A,
      value: serverIp,
      ttl: 3600,
    });

    return records;
  }

  private getZonePath(zoneName: string): string {
    const zonesDir = this.pathResolver.getBindZoneDir();
    return `${zonesDir}/${zoneName}.zone`;
  }
}
