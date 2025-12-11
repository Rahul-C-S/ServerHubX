import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemUsersService } from './system-users.service.js';
import { SystemUsersController } from './system-users.controller.js';
import { SystemUser } from './entities/system-user.entity.js';
import { SSHKey } from './entities/ssh-key.entity.js';
import { CoreModule } from '../../core/core.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([SystemUser, SSHKey]),
    CoreModule,
  ],
  providers: [SystemUsersService],
  controllers: [SystemUsersController],
  exports: [SystemUsersService],
})
export class SystemUsersModule {}
