import { Module } from '@nestjs/common';
import { ExecutorModule } from './executor/executor.module.js';
import { ValidatorsModule } from './validators/validators.module.js';
import { DistroModule } from './distro/distro.module.js';
import { RollbackModule } from './rollback/rollback.module.js';
import { AuditModule } from './audit/audit.module.js';

@Module({
  imports: [
    ExecutorModule,
    ValidatorsModule,
    DistroModule,
    RollbackModule,
    AuditModule,
  ],
  exports: [
    ExecutorModule,
    ValidatorsModule,
    DistroModule,
    RollbackModule,
    AuditModule,
  ],
})
export class CoreModule {}
