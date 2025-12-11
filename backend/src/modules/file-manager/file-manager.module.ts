import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { FileManagerService } from './file-manager.service.js';
import { FileManagerController } from './file-manager.controller.js';
import { SystemUser } from '../system-users/entities/system-user.entity.js';
import { Domain } from '../domains/entities/domain.entity.js';
import { CoreModule } from '../../core/core.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([SystemUser, Domain]),
    MulterModule.register({
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
      },
    }),
    CoreModule,
  ],
  controllers: [FileManagerController],
  providers: [FileManagerService],
  exports: [FileManagerService],
})
export class FileManagerModule {}
