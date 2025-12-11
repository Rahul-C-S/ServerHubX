import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { NotificationPreferences } from './entities/notification-preferences.entity';
import { EmailProvider } from './providers/email.provider';
import { SmsProvider } from './providers/sms.provider';
import { WebhookProvider } from './providers/webhook.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationPreferences]),
    ConfigModule,
  ],
  providers: [
    NotificationsService,
    NotificationDispatcherService,
    EmailProvider,
    SmsProvider,
    WebhookProvider,
  ],
  controllers: [NotificationsController],
  exports: [NotificationsService, NotificationDispatcherService],
})
export class NotificationsModule {}
