import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import type { NotificationProvider, NotificationPayload, NotificationResult } from './notification.interface';

interface WebhookConfig {
  url?: string;
  secret?: string;
  headers?: Record<string, string>;
  format?: 'json' | 'slack' | 'discord';
}

@Injectable()
export class WebhookProvider implements NotificationProvider {
  private readonly logger = new Logger(WebhookProvider.name);

  async send(payload: NotificationPayload, config: WebhookConfig): Promise<NotificationResult> {
    if (!config.url) {
      return { success: false, provider: 'webhook', error: 'No webhook URL configured' };
    }

    try {
      const body = this.formatBody(payload, config.format || 'json');
      const bodyString = JSON.stringify(body);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...config.headers,
      };

      // Add HMAC signature if secret is configured
      if (config.secret) {
        const signature = crypto
          .createHmac('sha256', config.secret)
          .update(bodyString)
          .digest('hex');
        headers['X-Webhook-Signature'] = `sha256=${signature}`;
      }

      const response = await fetch(config.url, {
        method: 'POST',
        headers,
        body: bodyString,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.logger.log(`Webhook sent to ${config.url}`);

      return {
        success: true,
        provider: 'webhook',
      };
    } catch (error) {
      this.logger.error(`Failed to send webhook: ${error}`);
      return {
        success: false,
        provider: 'webhook',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  validate(config: WebhookConfig): boolean {
    if (!config.url) return false;
    try {
      new URL(config.url);
      return true;
    } catch {
      return false;
    }
  }

  private formatBody(
    payload: NotificationPayload,
    format: 'json' | 'slack' | 'discord',
  ): unknown {
    switch (format) {
      case 'slack':
        return this.formatSlack(payload);
      case 'discord':
        return this.formatDiscord(payload);
      default:
        return this.formatJson(payload);
    }
  }

  private formatJson(payload: NotificationPayload): unknown {
    return {
      type: 'alert',
      severity: payload.severity,
      title: payload.title,
      message: payload.message,
      alertId: payload.alertId,
      ruleName: payload.ruleName,
      value: payload.value,
      threshold: payload.threshold,
      context: payload.context,
      timestamp: payload.timestamp.toISOString(),
    };
  }

  private formatSlack(payload: NotificationPayload): unknown {
    const colorMap = {
      info: '#3b82f6',
      warning: '#f59e0b',
      critical: '#ef4444',
    };

    return {
      attachments: [
        {
          color: colorMap[payload.severity],
          title: payload.title,
          text: payload.message,
          fields: [
            payload.value !== undefined && {
              title: 'Value',
              value: String(payload.value),
              short: true,
            },
            payload.threshold !== undefined && {
              title: 'Threshold',
              value: String(payload.threshold),
              short: true,
            },
            payload.ruleName && {
              title: 'Rule',
              value: payload.ruleName,
              short: true,
            },
          ].filter(Boolean),
          footer: 'ServerHubX',
          ts: Math.floor(payload.timestamp.getTime() / 1000),
        },
      ],
    };
  }

  private formatDiscord(payload: NotificationPayload): unknown {
    const colorMap = {
      info: 0x3b82f6,
      warning: 0xf59e0b,
      critical: 0xef4444,
    };

    return {
      embeds: [
        {
          title: payload.title,
          description: payload.message,
          color: colorMap[payload.severity],
          fields: [
            payload.value !== undefined && {
              name: 'Value',
              value: String(payload.value),
              inline: true,
            },
            payload.threshold !== undefined && {
              name: 'Threshold',
              value: String(payload.threshold),
              inline: true,
            },
            payload.ruleName && {
              name: 'Rule',
              value: payload.ruleName,
              inline: true,
            },
          ].filter(Boolean),
          footer: {
            text: 'ServerHubX',
          },
          timestamp: payload.timestamp.toISOString(),
        },
      ],
    };
  }
}
