import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DnsZone } from './entities/dns-zone.entity.js';
import { DnsRecord } from './entities/dns-record.entity.js';
import { DnsService } from './dns.service.js';
import { DnsController, DomainDnsController } from './dns.controller.js';
import { Bind9Service } from './services/bind9.service.js';
import { DomainsModule } from '../domains/domains.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([DnsZone, DnsRecord]),
    DomainsModule,
  ],
  controllers: [DnsController, DomainDnsController],
  providers: [DnsService, Bind9Service],
  exports: [DnsService, Bind9Service],
})
export class DnsModule {}
