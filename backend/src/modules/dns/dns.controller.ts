import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { DnsService } from './dns.service.js';
import { CreateZoneDto, UpdateZoneDto } from './dto/create-zone.dto.js';
import { CreateRecordDto, UpdateRecordDto } from './dto/create-record.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PoliciesGuard } from '../authorization/guards/policies.guard.js';
import { CheckPolicies } from '../authorization/decorators/check-policies.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { User } from '../users/entities/user.entity.js';
import type { DnsZone } from './entities/dns-zone.entity.js';
import type { DnsRecord } from './entities/dns-record.entity.js';

@Controller('dns')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class DnsController {
  constructor(private readonly dnsService: DnsService) {}

  // Zone endpoints
  @Get('zones')
  @CheckPolicies((ability) => ability.can('read', 'DnsZone'))
  async findAllZones(
    @Query('domainId') domainId?: string,
  ): Promise<DnsZone[]> {
    return this.dnsService.findAllZones(domainId);
  }

  @Get('zones/:id')
  @CheckPolicies((ability) => ability.can('read', 'DnsZone'))
  async findZone(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DnsZone> {
    return this.dnsService.findZone(id);
  }

  @Post('zones')
  @CheckPolicies((ability) => ability.can('create', 'DnsZone'))
  async createZone(
    @Body() dto: CreateZoneDto,
    @CurrentUser() user: User,
  ): Promise<DnsZone> {
    return this.dnsService.createZone(dto, user);
  }

  @Patch('zones/:id')
  @CheckPolicies((ability) => ability.can('manage', 'DnsZone'))
  async updateZone(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateZoneDto,
    @CurrentUser() user: User,
  ): Promise<DnsZone> {
    return this.dnsService.updateZone(id, dto, user);
  }

  @Delete('zones/:id')
  @CheckPolicies((ability) => ability.can('delete', 'DnsZone'))
  async deleteZone(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean }> {
    await this.dnsService.deleteZone(id, user);
    return { success: true };
  }

  @Post('zones/:id/template')
  @CheckPolicies((ability) => ability.can('manage', 'DnsZone'))
  async applyTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('templateName') templateName: string,
  ): Promise<DnsZone> {
    return this.dnsService.applyTemplate(id, templateName);
  }

  // Record endpoints
  @Get('zones/:zoneId/records')
  @CheckPolicies((ability) => ability.can('read', 'DnsZone'))
  async findRecords(
    @Param('zoneId', ParseUUIDPipe) zoneId: string,
  ): Promise<DnsRecord[]> {
    return this.dnsService.findRecords(zoneId);
  }

  @Post('zones/:zoneId/records')
  @CheckPolicies((ability) => ability.can('manage', 'DnsZone'))
  async createRecord(
    @Param('zoneId', ParseUUIDPipe) zoneId: string,
    @Body() dto: CreateRecordDto,
  ): Promise<DnsRecord> {
    return this.dnsService.createRecord(zoneId, dto);
  }

  @Get('records/:id')
  @CheckPolicies((ability) => ability.can('read', 'DnsZone'))
  async findRecord(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DnsRecord> {
    return this.dnsService.findRecord(id);
  }

  @Patch('records/:id')
  @CheckPolicies((ability) => ability.can('manage', 'DnsZone'))
  async updateRecord(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecordDto,
  ): Promise<DnsRecord> {
    return this.dnsService.updateRecord(id, dto);
  }

  @Delete('records/:id')
  @CheckPolicies((ability) => ability.can('manage', 'DnsZone'))
  async deleteRecord(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean }> {
    await this.dnsService.deleteRecord(id);
    return { success: true };
  }
}

// Domain-scoped DNS controller
@Controller('domains/:domainId/dns')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class DomainDnsController {
  constructor(private readonly dnsService: DnsService) {}

  @Get()
  @CheckPolicies((ability) => ability.can('read', 'Domain'))
  async findZones(
    @Param('domainId', ParseUUIDPipe) domainId: string,
  ): Promise<DnsZone[]> {
    return this.dnsService.findAllZones(domainId);
  }

  @Post()
  @CheckPolicies((ability) => ability.can('manage', 'Domain'))
  async createZone(
    @Param('domainId', ParseUUIDPipe) domainId: string,
    @Body() dto: CreateZoneDto,
    @CurrentUser() user: User,
  ): Promise<DnsZone> {
    return this.dnsService.createZone({ ...dto, domainId }, user);
  }

  @Get('records')
  @CheckPolicies((ability) => ability.can('read', 'Domain'))
  async findRecords(
    @Param('domainId', ParseUUIDPipe) domainId: string,
  ): Promise<DnsRecord[]> {
    const zones = await this.dnsService.findAllZones(domainId);
    const records: DnsRecord[] = [];
    for (const zone of zones) {
      records.push(...zone.records);
    }
    return records;
  }

  @Post('records')
  @CheckPolicies((ability) => ability.can('manage', 'Domain'))
  async createRecord(
    @Param('domainId', ParseUUIDPipe) _domainId: string,
    @Body() dto: CreateRecordDto & { zoneId: string },
  ): Promise<DnsRecord> {
    return this.dnsService.createRecord(dto.zoneId, dto);
  }
}
