import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Database } from './entities/database.entity.js';
import { DatabaseUser } from './entities/database-user.entity.js';
import { DatabasesService } from './databases.service.js';
import { DatabasesController } from './databases.controller.js';
import { MariaDBService } from './services/mariadb.service.js';
import { DomainsModule } from '../domains/domains.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Database, DatabaseUser]),
    DomainsModule,
  ],
  controllers: [DatabasesController],
  providers: [DatabasesService, MariaDBService],
  exports: [DatabasesService, MariaDBService],
})
export class DatabasesModule {}
