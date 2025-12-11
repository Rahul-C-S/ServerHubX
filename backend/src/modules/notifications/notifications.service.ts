import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPreferences } from './entities/notification-preferences.entity';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import type { UpdatePreferencesDto } from './dto/notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationPreferences)
    private prefsRepository: Repository<NotificationPreferences>,
    private dispatcher: NotificationDispatcherService,
  ) {}

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    let prefs = await this.prefsRepository.findOne({ where: { userId } });

    if (!prefs) {
      prefs = this.prefsRepository.create({
        userId,
        emailEnabled: true,
        smsEnabled: false,
        fcmEnabled: false,
        whatsappEnabled: false,
        webhookEnabled: false,
        severityFilters: { info: true, warning: true, critical: true },
      });
      await this.prefsRepository.save(prefs);
    }

    return prefs;
  }

  async updatePreferences(
    userId: string,
    dto: UpdatePreferencesDto,
  ): Promise<NotificationPreferences> {
    let prefs = await this.prefsRepository.findOne({ where: { userId } });

    if (!prefs) {
      prefs = this.prefsRepository.create({ userId });
    }

    Object.assign(prefs, dto);
    return this.prefsRepository.save(prefs);
  }

  async testChannel(
    userId: string,
    channel: 'email' | 'sms' | 'webhook',
  ): Promise<{ success: boolean; error?: string }> {
    return this.dispatcher.testChannel(userId, channel);
  }
}
