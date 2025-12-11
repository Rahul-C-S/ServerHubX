import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface WhatsAppMessage {
  to: string; // Phone number with country code (e.g., 1234567890)
  templateName: string;
  templateLanguage?: string;
  templateComponents?: WhatsAppTemplateComponent[];
}

export interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters: WhatsAppParameter[];
  sub_type?: 'quick_reply' | 'url';
  index?: number;
}

export interface WhatsAppParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
  text?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
  image?: {
    link: string;
  };
  document?: {
    link: string;
    filename: string;
  };
  video?: {
    link: string;
  };
}

export interface WhatsAppTextMessage {
  to: string;
  text: string;
  previewUrl?: boolean;
}

@Injectable()
export class WhatsAppProvider {
  private readonly logger = new Logger(WhatsAppProvider.name);
  private client: AxiosInstance | null = null;
  private phoneNumberId: string = '';
  private initialized = false;

  constructor(private readonly configService: ConfigService) {
    this.initialize();
  }

  private initialize() {
    try {
      const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
      this.phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID') || '';
      const apiVersion = this.configService.get<string>('WHATSAPP_API_VERSION') || 'v18.0';

      if (!accessToken || !this.phoneNumberId) {
        this.logger.warn('WhatsApp credentials not configured, WhatsApp notifications disabled');
        return;
      }

      this.client = axios.create({
        baseURL: `https://graph.facebook.com/${apiVersion}/${this.phoneNumberId}`,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      this.initialized = true;
      this.logger.log('WhatsApp provider initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize WhatsApp provider', error);
    }
  }

  async sendTemplate(
    message: WhatsAppMessage,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.initialized || !this.client) {
      return {
        success: false,
        error: 'WhatsApp provider not initialized',
      };
    }

    try {
      const payload: Record<string, unknown> = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.formatPhoneNumber(message.to),
        type: 'template',
        template: {
          name: message.templateName,
          language: {
            code: message.templateLanguage || 'en',
          },
          components: message.templateComponents || [],
        },
      };

      const response = await this.client.post('/messages', payload);

      const messageId = response.data?.messages?.[0]?.id;

      this.logger.debug(`WhatsApp template message sent: ${messageId}`);
      return {
        success: true,
        messageId,
      };
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);
      this.logger.error('Failed to send WhatsApp template message', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async sendText(
    message: WhatsAppTextMessage,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.initialized || !this.client) {
      return {
        success: false,
        error: 'WhatsApp provider not initialized',
      };
    }

    try {
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.formatPhoneNumber(message.to),
        type: 'text',
        text: {
          preview_url: message.previewUrl || false,
          body: message.text,
        },
      };

      const response = await this.client.post('/messages', payload);

      const messageId = response.data?.messages?.[0]?.id;

      this.logger.debug(`WhatsApp text message sent: ${messageId}`);
      return {
        success: true,
        messageId,
      };
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);
      this.logger.error('Failed to send WhatsApp text message', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async sendAlertNotification(
    to: string,
    alert: {
      severity: 'critical' | 'warning' | 'info';
      title: string;
      message: string;
      timestamp: Date;
      link?: string;
    },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Use the alert_notification template
    // This template should be created in Meta Business Manager
    const templateComponents: WhatsAppTemplateComponent[] = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: alert.severity.toUpperCase() },
          { type: 'text', text: alert.title },
          { type: 'text', text: alert.message },
          {
            type: 'text',
            text: alert.timestamp.toLocaleString(),
          },
        ],
      },
    ];

    if (alert.link) {
      templateComponents.push({
        type: 'button',
        sub_type: 'url',
        index: 0,
        parameters: [{ type: 'text', text: alert.link }],
      });
    }

    return this.sendTemplate({
      to,
      templateName: 'serverhubx_alert',
      templateLanguage: 'en',
      templateComponents,
    });
  }

  async sendBackupNotification(
    to: string,
    backup: {
      status: 'completed' | 'failed';
      domainName: string;
      backupType: string;
      size?: string;
      error?: string;
      timestamp: Date;
    },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const templateComponents: WhatsAppTemplateComponent[] = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: backup.status.toUpperCase() },
          { type: 'text', text: backup.domainName },
          { type: 'text', text: backup.backupType },
          { type: 'text', text: backup.size || 'N/A' },
          { type: 'text', text: backup.error || 'No errors' },
          {
            type: 'text',
            text: backup.timestamp.toLocaleString(),
          },
        ],
      },
    ];

    return this.sendTemplate({
      to,
      templateName: 'serverhubx_backup',
      templateLanguage: 'en',
      templateComponents,
    });
  }

  async sendSslExpiryNotification(
    to: string,
    ssl: {
      domainName: string;
      daysRemaining: number;
      expiryDate: Date;
    },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const templateComponents: WhatsAppTemplateComponent[] = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: ssl.domainName },
          { type: 'text', text: ssl.daysRemaining.toString() },
          {
            type: 'text',
            text: ssl.expiryDate.toLocaleDateString(),
          },
        ],
      },
    ];

    return this.sendTemplate({
      to,
      templateName: 'serverhubx_ssl_expiry',
      templateLanguage: 'en',
      templateComponents,
    });
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let formatted = phone.replace(/\D/g, '');

    // Ensure it doesn't start with a plus (API expects just digits)
    if (formatted.startsWith('+')) {
      formatted = formatted.substring(1);
    }

    return formatted;
  }

  private extractErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data;
      if (data?.error?.message) {
        return data.error.message;
      }
      if (data?.error?.error_data?.details) {
        return data.error.error_data.details;
      }
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown error';
  }

  isConfigured(): boolean {
    return this.initialized;
  }

  getPhoneNumberId(): string {
    return this.phoneNumberId;
  }
}
