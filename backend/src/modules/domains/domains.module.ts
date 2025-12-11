import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DomainsService } from './domains.service.js';
import { DomainsController } from './domains.controller.js';
import { VhostService } from './services/vhost.service.js';
import { PhpFpmService } from './services/php-fpm.service.js';
import { Domain } from './entities/domain.entity.js';
import { Subdomain } from './entities/subdomain.entity.js';
import { CoreModule } from '../../core/core.module.js';
import { SystemUsersModule } from '../system-users/system-users.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Domain, Subdomain]),
    CoreModule,
    SystemUsersModule,
  ],
  providers: [DomainsService, VhostService, PhpFpmService],
  controllers: [DomainsController],
  exports: [DomainsService, VhostService, PhpFpmService],
})
export class DomainsModule {}
