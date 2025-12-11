import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import type { NotificationProvider, NotificationPayload, NotificationResult } from './notification.interface';

interface SmsConfig {
  phoneNumber?: string;
  countryCode?: string;
}

@Injectable()
export class SmsProvider implements NotificationProvider {
  private readonly logger = new Logger(SmsProvider.name);
  private client: Twilio | null = null;
  private fromNumber: string;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get('TWILIO_AUTH_TOKEN');
    this.fromNumber = this.configService.get('TWILIO_FROM_NUMBER', '');

    if (accountSid && authToken) {
      this.client = new Twilio(accountSid, authToken);
    }
  }

  async send(payload: NotificationPayload, config: SmsConfig): Promise<NotificationResult> {
    if (!this.client) {
      return { success: false, provider: 'sms', error: 'Twilio not configured' };
    }

    if (!config.phoneNumber) {
      return { success: false, provider: 'sms', error: 'No phone number configured' };
    }

    try {
      const toNumber = this.formatPhoneNumber(config.phoneNumber, config.countryCode);
      const message = this.formatMessage(payload);

      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: toNumber,
      });

      this.logger.log(`SMS sent to ${toNumber}: ${result.sid}`);

      return {
        success: true,
        provider: 'sms',
        messageId: result.sid,
      };
    } catch (error) {
      this.logger.error(`Failed to send SMS: ${error}`);
      return {
        success: false,
        provider: 'sms',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  validate(config: SmsConfig): boolean {
    return !!config.phoneNumber && config.phoneNumber.length >= 10;
  }

  private formatPhoneNumber(number: string, countryCode?: string): string {
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    return `+${countryCode || '1'}${cleaned}`;
  }

  private formatMessage(payload: NotificationPayload): string {
    // SMS has 160 char limit, be concise
    const severity = payload.severity.toUpperCase();
    let msg = `[${severity}] ${payload.title}`;

    if (payload.value !== undefined) {
      msg += ` | Value: ${payload.value}`;
    }

    // Truncate if too long
    if (msg.length > 155) {
      msg = msg.substring(0, 152) + '...';
    }

    return msg;
  }
}
