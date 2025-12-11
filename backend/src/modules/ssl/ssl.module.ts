import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Certificate } from './entities/certificate.entity.js';
import { Domain } from '../domains/entities/domain.entity.js';
import { SslService } from './ssl.service.js';
import { SslController } from './ssl.controller.js';
import { AcmeService } from './services/acme.service.js';
import { SslRenewalProcessor } from './ssl-renewal.processor.js';
import { CoreModule } from '../../core/core.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Certificate, Domain]),
    ScheduleModule.forRoot(),
    CoreModule,
  ],
  controllers: [SslController],
  providers: [SslService, AcmeService, SslRenewalProcessor],
  exports: [SslService],
})
export class SslModule {}
