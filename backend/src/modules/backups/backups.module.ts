import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { BackupsService } from './backups.service';
import { BackupsController } from './backups.controller';
import { BackupProcessor } from './processors/backup.processor';
import { Backup } from './entities/backup.entity';
import { BackupSchedule } from './entities/backup-schedule.entity';
import { StorageFactory } from './storage/storage.factory';
import { Domain } from '../domains/entities/domain.entity';
import { CoreModule } from '../../core/core.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Backup, BackupSchedule, Domain]),
    BullModule.registerQueue({
      name: 'backup',
    }),
    CoreModule,
  ],
  providers: [BackupsService, BackupProcessor, StorageFactory],
  controllers: [BackupsController],
  exports: [BackupsService],
})
export class BackupsModule {}
