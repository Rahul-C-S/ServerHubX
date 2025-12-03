import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity.js';
import { AuditLoggerService } from './audit-logger.service.js';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [AuditLoggerService],
  exports: [AuditLoggerService],
})
export class AuditModule {}
