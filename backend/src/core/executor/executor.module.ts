import { Global, Module } from '@nestjs/common';
import { CommandExecutorService } from './command-executor.service.js';

@Global()
@Module({
  providers: [CommandExecutorService],
  exports: [CommandExecutorService],
})
export class ExecutorModule {}
