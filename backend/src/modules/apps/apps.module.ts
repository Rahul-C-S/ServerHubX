import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { App } from './entities/app.entity.js';
import { AppEnvironment } from './entities/app-environment.entity.js';
import { AppsService } from './apps.service.js';
import { AppsController, DomainAppsController } from './apps.controller.js';
import { Pm2Service } from './services/pm2.service.js';
import { PortAllocationService } from './services/port-allocation.service.js';
import { NodeAppService } from './services/node-app.service.js';
import { PhpAppService } from './services/php-app.service.js';
import { DeploymentService } from './services/deployment.service.js';
import { DeploymentProcessor } from './processors/deployment.processor.js';
import { DomainsModule } from '../domains/domains.module.js';
import { Domain } from '../domains/entities/domain.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([App, AppEnvironment, Domain]),
    BullModule.registerQueue({
      name: 'deployment',
    }),
    DomainsModule,
  ],
  providers: [
    AppsService,
    Pm2Service,
    PortAllocationService,
    NodeAppService,
    PhpAppService,
    DeploymentService,
    DeploymentProcessor,
  ],
  controllers: [AppsController, DomainAppsController],
  exports: [AppsService, Pm2Service, PortAllocationService, DeploymentService],
})
export class AppsModule {}
