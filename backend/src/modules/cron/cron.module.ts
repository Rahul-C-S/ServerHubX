import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CronService } from './cron.service';
import { CronController } from './cron.controller';
import { CronJob } from './entities/cron-job.entity';
import { Domain } from '../domains/entities/domain.entity';
import { CoreModule } from '../../core/core.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CronJob, Domain]),
    CoreModule,
  ],
  providers: [CronService],
  controllers: [CronController],
  exports: [CronService],
})
export class CronModule {}
