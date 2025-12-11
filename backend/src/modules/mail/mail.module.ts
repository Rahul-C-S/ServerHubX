import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailService } from './mail.service.js';
import { MailController } from './mail.controller.js';
import { PostfixService } from './services/postfix.service.js';
import { DovecotService } from './services/dovecot.service.js';
import { MailDomain } from './entities/mail-domain.entity.js';
import { Mailbox } from './entities/mailbox.entity.js';
import { MailAlias } from './entities/mail-alias.entity.js';
import { Domain } from '../domains/entities/domain.entity.js';
import { AuditModule } from '../../core/audit/audit.module.js';
import { ExecutorModule } from '../../core/executor/executor.module.js';
import { DistroModule } from '../../core/distro/distro.module.js';
import { LoggerModule } from '../../common/logger/logger.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([MailDomain, Mailbox, MailAlias, Domain]),
    AuditModule,
    ExecutorModule,
    DistroModule,
    LoggerModule,
  ],
  controllers: [MailController],
  providers: [MailService, PostfixService, DovecotService],
  exports: [MailService],
})
export class MailModule {}
