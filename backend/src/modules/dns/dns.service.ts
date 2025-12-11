import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { DnsZone, ZoneStatus } from './entities/dns-zone.entity.js';
import { DnsRecord, DnsRecordType } from './entities/dns-record.entity.js';
import { Bind9Service } from './services/bind9.service.js';
import { LoggerService } from '../../common/logger/logger.service.js';
import { AuditLoggerService } from '../../core/audit/audit-logger.service.js';
import { CreateZoneDto, UpdateZoneDto } from './dto/create-zone.dto.js';
import { CreateRecordDto, UpdateRecordDto } from './dto/create-record.dto.js';
import { AuditOperationType, AuditResourceType } from '../../core/audit/entities/audit-log.entity.js';
import type { User } from '../users/entities/user.entity.js';

@Injectable()
export class DnsService {
  private readonly serverIp: string;

  constructor(
    @InjectRepository(DnsZone)
    private readonly zoneRepository: Repository<DnsZone>,
    @InjectRepository(DnsRecord)
    private readonly recordRepository: Repository<DnsRecord>,
    private readonly bind9Service: Bind9Service,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly auditLogger: AuditLoggerService,
  ) {
    this.serverIp = this.configService.get<string>('SERVER_IP', '127.0.0.1');
  }

  // Zone Methods
  async findAllZones(domainId?: string): Promise<DnsZone[]> {
    const query = this.zoneRepository
      .createQueryBuilder('zone')
      .leftJoinAndSelect('zone.domain', 'domain')
      .leftJoinAndSelect('zone.records', 'records');

    if (domainId) {
      query.where('zone.domainId = :domainId', { domainId });
    }

    return query.orderBy('zone.zoneName', 'ASC').getMany();
  }

  async findZone(id: string): Promise<DnsZone> {
    const zone = await this.zoneRepository.findOne({
      where: { id },
      relations: ['domain', 'records'],
    });

    if (!zone) {
      throw new NotFoundException(`DNS zone with ID ${id} not found`);
    }

    return zone;
  }

  async findZoneByName(zoneName: string): Promise<DnsZone | null> {
    return this.zoneRepository.findOne({
      where: { zoneName },
      relations: ['domain', 'records'],
    });
  }

  async createZone(dto: CreateZoneDto, performedBy: User): Promise<DnsZone> {
    // Check if zone already exists
    const existing = await this.findZoneByName(dto.zoneName);
    if (existing) {
      throw new ConflictException(`Zone "${dto.zoneName}" already exists`);
    }

    // Create zone entity
    const zone = this.zoneRepository.create({
      zoneName: dto.zoneName,
      ttl: dto.ttl || 86400,
      primaryNs: dto.primaryNs || `ns1.${dto.zoneName}.`,
      adminEmail: dto.adminEmail || `admin.${dto.zoneName}.`,
      soaRefresh: dto.soaRefresh || 7200,
      soaRetry: dto.soaRetry || 3600,
      soaExpire: dto.soaExpire || 1209600,
      soaMinimum: dto.soaMinimum || 86400,
      serial: this.generateSerial(),
      status: ZoneStatus.PENDING,
      domainId: dto.domainId,
    });

    await this.zoneRepository.save(zone);

    // Create default records
    const defaultRecords = this.bind9Service.generateDefaultRecords(dto.zoneName, this.serverIp);
    for (const recordData of defaultRecords) {
      const record = this.recordRepository.create({
        ...recordData,
        zoneId: zone.id,
        enabled: true,
      });
      await this.recordRepository.save(record);
    }

    // Reload zone with records
    const zoneWithRecords = await this.findZone(zone.id);

    // Write zone file
    await this.writeAndReloadZone(zoneWithRecords);

    // Audit log
    await this.auditLogger.log({
      operationType: AuditOperationType.CREATE,
      resourceType: AuditResourceType.DNS_ZONE,
      resourceId: zone.id,
      resourceName: zone.zoneName,
      description: `Created DNS zone ${zone.zoneName}`,
    }, { userId: performedBy.id });

    this.logger.log(`Created DNS zone: ${zone.zoneName}`, 'DnsService');

    return this.findZone(zone.id);
  }

  async updateZone(id: string, dto: UpdateZoneDto, performedBy: User): Promise<DnsZone> {
    const zone = await this.findZone(id);

    // Update zone fields
    if (dto.ttl !== undefined) zone.ttl = dto.ttl;
    if (dto.primaryNs !== undefined) zone.primaryNs = dto.primaryNs;
    if (dto.adminEmail !== undefined) zone.adminEmail = dto.adminEmail;
    if (dto.soaRefresh !== undefined) zone.soaRefresh = dto.soaRefresh;
    if (dto.soaRetry !== undefined) zone.soaRetry = dto.soaRetry;
    if (dto.soaExpire !== undefined) zone.soaExpire = dto.soaExpire;
    if (dto.soaMinimum !== undefined) zone.soaMinimum = dto.soaMinimum;

    // Increment serial
    zone.serial = zone.generateSerial();

    await this.zoneRepository.save(zone);

    // Write and reload zone
    await this.writeAndReloadZone(zone);

    // Audit log
    await this.auditLogger.log({
      operationType: AuditOperationType.UPDATE,
      resourceType: AuditResourceType.DNS_ZONE,
      resourceId: zone.id,
      resourceName: zone.zoneName,
      description: `Updated DNS zone ${zone.zoneName}`,
    }, { userId: performedBy.id });

    return this.findZone(zone.id);
  }

  async deleteZone(id: string, performedBy: User): Promise<void> {
    const zone = await this.findZone(id);

    // Remove from Bind9 config
    await this.bind9Service.removeZoneFromConfig(zone.zoneName);

    // Delete zone file
    await this.bind9Service.deleteZoneFile(zone.zoneName);

    // Reload Bind9
    await this.bind9Service.reloadAll();

    // Delete from database (cascade will delete records)
    await this.zoneRepository.remove(zone);

    // Audit log
    await this.auditLogger.log({
      operationType: AuditOperationType.DELETE,
      resourceType: AuditResourceType.DNS_ZONE,
      resourceId: id,
      resourceName: zone.zoneName,
      description: `Deleted DNS zone ${zone.zoneName}`,
    }, { userId: performedBy.id });

    this.logger.log(`Deleted DNS zone: ${zone.zoneName}`, 'DnsService');
  }

  // Record Methods
  async findRecords(zoneId: string): Promise<DnsRecord[]> {
    return this.recordRepository.find({
      where: { zoneId },
      order: { type: 'ASC', name: 'ASC' },
    });
  }

  async findRecord(id: string): Promise<DnsRecord> {
    const record = await this.recordRepository.findOne({
      where: { id },
      relations: ['zone'],
    });

    if (!record) {
      throw new NotFoundException(`DNS record with ID ${id} not found`);
    }

    return record;
  }

  async createRecord(zoneId: string, dto: CreateRecordDto): Promise<DnsRecord> {
    const zone = await this.findZone(zoneId);

    // Validate record value
    const validation = DnsRecord.validateValue(dto.type, dto.value);
    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    // Create record
    const record = this.recordRepository.create({
      name: dto.name,
      type: dto.type,
      value: dto.value,
      ttl: dto.ttl || 3600,
      priority: dto.priority,
      weight: dto.weight,
      port: dto.port,
      flag: dto.flag,
      tag: dto.tag,
      enabled: dto.enabled ?? true,
      comment: dto.comment,
      zoneId: zone.id,
    });

    await this.recordRepository.save(record);

    // Update zone serial and reload
    zone.serial = zone.generateSerial();
    await this.zoneRepository.save(zone);
    await this.writeAndReloadZone(zone);

    this.logger.log(`Created DNS record: ${record.name} ${record.type} in ${zone.zoneName}`, 'DnsService');

    return record;
  }

  async updateRecord(id: string, dto: UpdateRecordDto): Promise<DnsRecord> {
    const record = await this.findRecord(id);
    const zone = await this.findZone(record.zoneId);

    // Validate new value if provided
    if (dto.value) {
      const validation = DnsRecord.validateValue(record.type, dto.value);
      if (!validation.valid) {
        throw new BadRequestException(validation.error);
      }
    }

    // Update record fields
    if (dto.name !== undefined) record.name = dto.name;
    if (dto.value !== undefined) record.value = dto.value;
    if (dto.ttl !== undefined) record.ttl = dto.ttl;
    if (dto.priority !== undefined) record.priority = dto.priority;
    if (dto.weight !== undefined) record.weight = dto.weight;
    if (dto.port !== undefined) record.port = dto.port;
    if (dto.flag !== undefined) record.flag = dto.flag;
    if (dto.tag !== undefined) record.tag = dto.tag;
    if (dto.enabled !== undefined) record.enabled = dto.enabled;
    if (dto.comment !== undefined) record.comment = dto.comment;

    await this.recordRepository.save(record);

    // Update zone serial and reload
    zone.serial = zone.generateSerial();
    await this.zoneRepository.save(zone);
    await this.writeAndReloadZone(zone);

    this.logger.log(`Updated DNS record: ${record.name} ${record.type} in ${zone.zoneName}`, 'DnsService');

    return record;
  }

  async deleteRecord(id: string): Promise<void> {
    const record = await this.findRecord(id);
    const zone = await this.findZone(record.zoneId);

    await this.recordRepository.remove(record);

    // Update zone serial and reload
    zone.serial = zone.generateSerial();
    await this.zoneRepository.save(zone);
    await this.writeAndReloadZone(zone);

    this.logger.log(`Deleted DNS record: ${record.name} ${record.type} from ${zone.zoneName}`, 'DnsService');
  }

  // Helper Methods
  private async writeAndReloadZone(zone: DnsZone): Promise<void> {
    // Reload zone with records
    const zoneWithRecords = await this.findZone(zone.id);

    // Generate zone file content
    const content = this.bind9Service.generateZoneFile(zoneWithRecords, zoneWithRecords.records);

    // Write zone file
    const writeResult = await this.bind9Service.writeZoneFile(zone.zoneName, content);
    if (!writeResult.success) {
      zone.status = ZoneStatus.ERROR;
      zone.lastError = writeResult.error;
      await this.zoneRepository.save(zone);
      throw new BadRequestException(`Failed to write zone file: ${writeResult.error}`);
    }

    // Check zone validity
    const checkResult = await this.bind9Service.checkZone(zone.zoneName);
    zone.lastCheckedAt = new Date();

    if (!checkResult.valid) {
      zone.status = ZoneStatus.ERROR;
      zone.lastError = checkResult.error;
      await this.zoneRepository.save(zone);
      throw new BadRequestException(`Zone file validation failed: ${checkResult.error}`);
    }

    // Add zone to config if this is a new zone
    if (zone.status === ZoneStatus.PENDING) {
      await this.bind9Service.addZoneToConfig(zone.zoneName);
    }

    // Reload zone
    const reloadResult = await this.bind9Service.reloadZone(zone.zoneName);
    if (!reloadResult.success) {
      zone.status = ZoneStatus.ERROR;
      zone.lastError = reloadResult.error;
      await this.zoneRepository.save(zone);
      throw new BadRequestException(`Failed to reload zone: ${reloadResult.error}`);
    }

    zone.status = ZoneStatus.ACTIVE;
    zone.lastError = undefined;
    await this.zoneRepository.save(zone);
  }

  private generateSerial(): number {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    return parseInt(`${dateStr}01`);
  }

  // Template Methods
  async applyTemplate(zoneId: string, templateName: string): Promise<DnsZone> {
    const zone = await this.findZone(zoneId);

    // Get template records based on template name
    const templateRecords = this.getTemplateRecords(templateName, zone.zoneName);

    // Add template records
    for (const recordData of templateRecords) {
      const record = this.recordRepository.create({
        ...recordData,
        zoneId: zone.id,
        enabled: true,
      });
      await this.recordRepository.save(record);
    }

    // Update zone serial and reload
    zone.serial = zone.generateSerial();
    await this.zoneRepository.save(zone);
    await this.writeAndReloadZone(zone);

    return this.findZone(zone.id);
  }

  private getTemplateRecords(templateName: string, zoneName: string): Partial<DnsRecord>[] {
    switch (templateName) {
      case 'google-workspace':
        return [
          { name: '@', type: DnsRecordType.MX, value: 'aspmx.l.google.com.', priority: 1, ttl: 3600 },
          { name: '@', type: DnsRecordType.MX, value: 'alt1.aspmx.l.google.com.', priority: 5, ttl: 3600 },
          { name: '@', type: DnsRecordType.MX, value: 'alt2.aspmx.l.google.com.', priority: 5, ttl: 3600 },
          { name: '@', type: DnsRecordType.MX, value: 'alt3.aspmx.l.google.com.', priority: 10, ttl: 3600 },
          { name: '@', type: DnsRecordType.MX, value: 'alt4.aspmx.l.google.com.', priority: 10, ttl: 3600 },
          { name: '@', type: DnsRecordType.TXT, value: 'v=spf1 include:_spf.google.com ~all', ttl: 3600 },
        ];

      case 'microsoft-365':
        return [
          { name: '@', type: DnsRecordType.MX, value: `${zoneName.replace(/\./g, '-')}.mail.protection.outlook.com.`, priority: 0, ttl: 3600 },
          { name: '@', type: DnsRecordType.TXT, value: 'v=spf1 include:spf.protection.outlook.com -all', ttl: 3600 },
          { name: 'autodiscover', type: DnsRecordType.CNAME, value: 'autodiscover.outlook.com.', ttl: 3600 },
        ];

      case 'basic-mail':
        return [
          { name: '@', type: DnsRecordType.MX, value: `mail.${zoneName}.`, priority: 10, ttl: 3600 },
          { name: 'mail', type: DnsRecordType.A, value: this.serverIp, ttl: 3600 },
          { name: '@', type: DnsRecordType.TXT, value: `v=spf1 mx a ip4:${this.serverIp} ~all`, ttl: 3600 },
        ];

      default:
        return [];
    }
  }
}
