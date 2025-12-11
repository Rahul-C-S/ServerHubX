import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationPreferences } from './entities/notification-preferences.entity';
import { EmailProvider } from './providers/email.provider';
import { SmsProvider } from './providers/sms.provider';
import { WebhookProvider } from './providers/webhook.provider';
import type { NotificationPayload, NotificationResult } from './providers/notification.interface';
import type { AlertInstance } from '../monitoring/entities/alert-instance.entity';
import type { AlertRule } from '../monitoring/entities/alert-rule.entity';

@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);

  constructor(
    @InjectRepository(NotificationPreferences)
    private prefsRepository: Repository<NotificationPreferences>,
    private emailProvider: EmailProvider,
    private smsProvider: SmsProvider,
    private webhookProvider: WebhookProvider,
  ) {}

  @OnEvent('alert.fired')
  async handleAlertFired(event: { alert: AlertInstance; rule: AlertRule }): Promise<void> {
    const { alert, rule } = event;

    const payload: NotificationPayload = {
      title: rule.name,
      message: rule.description || `Alert triggered: ${rule.name}`,
      severity: rule.severity,
      alertId: alert.id,
      ruleName: rule.name,
      value: Number(alert.value),
      threshold: Number(alert.threshold),
      context: alert.context,
      timestamp: alert.firedAt,
    };

    await this.dispatchToAllUsers(payload, rule);
  }

  @OnEvent('alert.resolved')
  async handleAlertResolved(event: { alert: AlertInstance; rule: AlertRule }): Promise<void> {
    const { alert, rule } = event;

    const payload: NotificationPayload = {
      title: `Resolved: ${rule.name}`,
      message: `Alert has been resolved: ${rule.name}`,
      severity: 'info',
      alertId: alert.id,
      ruleName: rule.name,
      timestamp: alert.resolvedAt || new Date(),
    };

    await this.dispatchToAllUsers(payload, rule);
  }

  async dispatch(
    userId: string,
    payload: NotificationPayload,
    channelOverrides?: Record<string, boolean>,
  ): Promise<NotificationResult[]> {
    const prefs = await this.getOrCreatePreferences(userId);
    const results: NotificationResult[] = [];

    // Check quiet hours
    if (this.isInQuietHours(prefs) && payload.severity !== 'critical') {
      this.logger.log(`Skipping notification for user ${userId} - quiet hours`);
      return results;
    }

    // Check severity filters
    if (!this.shouldNotifyForSeverity(prefs, payload.severity)) {
      this.logger.log(`Skipping notification for user ${userId} - severity filtered`);
      return results;
    }

    const channels = this.determineChannels(prefs, channelOverrides);

    // Send to each enabled channel
    if (channels.email && prefs.emailConfig?.address) {
      const result = await this.emailProvider.send(payload, prefs.emailConfig);
      results.push(result);
    }

    if (channels.sms && prefs.smsConfig?.phoneNumber) {
      const result = await this.smsProvider.send(payload, prefs.smsConfig);
      results.push(result);
    }

    if (channels.webhook && prefs.webhookConfig?.url) {
      const result = await this.webhookProvider.send(payload, prefs.webhookConfig);
      results.push(result);
    }

    return results;
  }

  async testChannel(
    userId: string,
    channel: 'email' | 'sms' | 'webhook',
  ): Promise<NotificationResult> {
    const prefs = await this.getOrCreatePreferences(userId);

    const testPayload: NotificationPayload = {
      title: 'Test Notification',
      message: 'This is a test notification from ServerHubX',
      severity: 'info',
      timestamp: new Date(),
    };

    switch (channel) {
      case 'email':
        if (!prefs.emailConfig?.address) {
          return { success: false, provider: 'email', error: 'No email configured' };
        }
        return this.emailProvider.send(testPayload, prefs.emailConfig);

      case 'sms':
        if (!prefs.smsConfig?.phoneNumber) {
          return { success: false, provider: 'sms', error: 'No phone number configured' };
        }
        return this.smsProvider.send(testPayload, prefs.smsConfig);

      case 'webhook':
        if (!prefs.webhookConfig?.url) {
          return { success: false, provider: 'webhook', error: 'No webhook URL configured' };
        }
        return this.webhookProvider.send(testPayload, prefs.webhookConfig);

      default:
        return { success: false, provider: channel, error: 'Unknown channel' };
    }
  }

  private async dispatchToAllUsers(
    payload: NotificationPayload,
    rule: AlertRule,
  ): Promise<void> {
    // Get all users with notification preferences
    const allPrefs = await this.prefsRepository.find();

    for (const prefs of allPrefs) {
      // Apply rule-specific notification overrides (filter out webhookUrl as it's not a boolean)
      const overrides = rule.notificationOverrides || {};
      const channelOverrides: Record<string, boolean> = {
        ...(overrides.email !== undefined && { email: overrides.email }),
        ...(overrides.sms !== undefined && { sms: overrides.sms }),
        ...(overrides.fcm !== undefined && { fcm: overrides.fcm }),
        ...(overrides.whatsapp !== undefined && { whatsapp: overrides.whatsapp }),
        ...(overrides.webhook !== undefined && { webhook: overrides.webhook }),
      };

      try {
        await this.dispatch(prefs.userId, payload, channelOverrides);
      } catch (error) {
        this.logger.error(`Failed to dispatch notification to user ${prefs.userId}: ${error}`);
      }
    }
  }

  private async getOrCreatePreferences(userId: string): Promise<NotificationPreferences> {
    let prefs = await this.prefsRepository.findOne({ where: { userId } });

    if (!prefs) {
      prefs = this.prefsRepository.create({
        userId,
        emailEnabled: true,
        severityFilters: { info: true, warning: true, critical: true },
      });
      await this.prefsRepository.save(prefs);
    }

    return prefs;
  }

  private isInQuietHours(prefs: NotificationPreferences): boolean {
    if (!prefs.schedulePreferences?.quietHoursEnabled) {
      return false;
    }

    const { quietHoursStart, quietHoursEnd, quietHoursTimezone } = prefs.schedulePreferences;
    if (!quietHoursStart || !quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const tz = quietHoursTimezone || 'UTC';

    const currentTime = now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      timeZone: tz,
    });

    // Simple time comparison (HH:MM format)
    if (quietHoursStart <= quietHoursEnd) {
      return currentTime >= quietHoursStart && currentTime <= quietHoursEnd;
    } else {
      // Spans midnight
      return currentTime >= quietHoursStart || currentTime <= quietHoursEnd;
    }
  }

  private shouldNotifyForSeverity(
    prefs: NotificationPreferences,
    severity: 'info' | 'warning' | 'critical',
  ): boolean {
    if (!prefs.severityFilters) {
      return true;
    }
    return prefs.severityFilters[severity] !== false;
  }

  private determineChannels(
    prefs: NotificationPreferences,
    overrides?: Record<string, boolean>,
  ): Record<string, boolean> {
    return {
      email: overrides?.email ?? prefs.emailEnabled,
      sms: overrides?.sms ?? prefs.smsEnabled,
      webhook: overrides?.webhook ?? prefs.webhookEnabled,
    };
  }
}
