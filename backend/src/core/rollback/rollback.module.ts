import { Global, Module } from '@nestjs/common';
import { TransactionManagerService } from './transaction-manager.service.js';

@Global()
@Module({
  providers: [TransactionManagerService],
  exports: [TransactionManagerService],
})
export class RollbackModule {}
