import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';
import { MonitoringGateway } from './monitoring.gateway';
import { MetricsService } from './metrics.service';
import { AlertEngineService } from './alert-engine.service';
import { AlertRule } from './entities/alert-rule.entity';
import { AlertInstance } from './entities/alert-instance.entity';
import { DefaultAlertRulesSeed } from './seeds/default-alert-rules.seed';
import { CoreModule } from '../../core/core.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AlertRule, AlertInstance]),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    CoreModule,
  ],
  providers: [
    MonitoringService,
    MetricsService,
    AlertEngineService,
    MonitoringGateway,
    DefaultAlertRulesSeed,
  ],
  controllers: [MonitoringController],
  exports: [MonitoringService, MetricsService],
})
export class MonitoringModule {}
