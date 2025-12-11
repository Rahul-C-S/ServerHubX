import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { NotificationProvider, NotificationPayload, NotificationResult } from './notification.interface';

interface EmailConfig {
  address?: string;
}

@Injectable()
export class EmailProvider implements NotificationProvider {
  private readonly logger = new Logger(EmailProvider.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST', 'localhost'),
      port: this.configService.get('SMTP_PORT', 587),
      secure: this.configService.get('SMTP_SECURE', false),
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  async send(payload: NotificationPayload, config: EmailConfig): Promise<NotificationResult> {
    if (!config.address) {
      return { success: false, provider: 'email', error: 'No email address configured' };
    }

    try {
      const html = this.generateEmailHtml(payload);

      const result = await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM', 'ServerHubX <noreply@serverhubx.com>'),
        to: config.address,
        subject: `[${payload.severity.toUpperCase()}] ${payload.title}`,
        html,
      });

      this.logger.log(`Email sent to ${config.address}: ${result.messageId}`);

      return {
        success: true,
        provider: 'email',
        messageId: result.messageId,
      };
    } catch (error) {
      this.logger.error(`Failed to send email: ${error}`);
      return {
        success: false,
        provider: 'email',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  validate(config: EmailConfig): boolean {
    return !!config.address && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.address);
  }

  private generateEmailHtml(payload: NotificationPayload): string {
    const severityColors = {
      info: '#3b82f6',
      warning: '#f59e0b',
      critical: '#ef4444',
    };

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="background: ${severityColors[payload.severity]}; color: white; padding: 20px;">
      <h1 style="margin: 0; font-size: 20px;">${payload.title}</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">${payload.severity.toUpperCase()} Alert</p>
    </div>
    <div style="padding: 20px;">
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #333;">${payload.message}</p>
      ${payload.value !== undefined ? `
      <div style="background: #f5f5f5; padding: 12px; border-radius: 4px; margin-bottom: 16px;">
        <p style="margin: 0; font-size: 14px; color: #666;">
          <strong>Current Value:</strong> ${payload.value}
          ${payload.threshold !== undefined ? ` | <strong>Threshold:</strong> ${payload.threshold}` : ''}
        </p>
      </div>
      ` : ''}
      ${payload.ruleName ? `<p style="margin: 0; font-size: 14px; color: #666;"><strong>Rule:</strong> ${payload.ruleName}</p>` : ''}
      <p style="margin: 16px 0 0 0; font-size: 12px; color: #999;">
        Sent at ${payload.timestamp.toISOString()} by ServerHubX
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}
