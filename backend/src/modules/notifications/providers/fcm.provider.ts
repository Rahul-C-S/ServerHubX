import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

export interface FcmNotification {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  priority?: 'high' | 'normal';
}

export interface FcmConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

@Injectable()
export class FcmProvider {
  private readonly logger = new Logger(FcmProvider.name);
  private app: admin.app.App | null = null;
  private initialized = false;

  constructor(private readonly configService: ConfigService) {
    this.initialize();
  }

  private initialize() {
    try {
      const projectId = this.configService.get<string>('FCM_PROJECT_ID');
      const clientEmail = this.configService.get<string>('FCM_CLIENT_EMAIL');
      const privateKey = this.configService.get<string>('FCM_PRIVATE_KEY');

      if (!projectId || !clientEmail || !privateKey) {
        this.logger.warn('FCM credentials not configured, push notifications disabled');
        return;
      }

      // Handle escaped newlines in private key
      const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: formattedPrivateKey,
        }),
      });

      this.initialized = true;
      this.logger.log('FCM provider initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize FCM provider', error);
    }
  }

  async send(notification: FcmNotification): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.initialized || !this.app) {
      return {
        success: false,
        error: 'FCM provider not initialized',
      };
    }

    try {
      const message: admin.messaging.Message = {
        token: notification.token,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl,
        },
        data: notification.data,
        android: {
          priority: notification.priority === 'high' ? 'high' : 'normal',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            channelId: 'serverhubx_alerts',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              contentAvailable: true,
            },
          },
          headers: {
            'apns-priority': notification.priority === 'high' ? '10' : '5',
          },
        },
        webpush: {
          notification: {
            icon: '/icon-192.png',
            badge: '/badge-72.png',
            vibrate: [200, 100, 200],
            requireInteraction: notification.priority === 'high',
          },
          fcmOptions: {
            link: notification.data?.link || '/',
          },
        },
      };

      const messageId = await admin.messaging(this.app).send(message);

      this.logger.debug(`FCM notification sent: ${messageId}`);
      return {
        success: true,
        messageId,
      };
    } catch (error) {
      this.logger.error('Failed to send FCM notification', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendToMultiple(
    tokens: string[],
    notification: Omit<FcmNotification, 'token'>,
  ): Promise<{ successCount: number; failureCount: number; errors: string[] }> {
    if (!this.initialized || !this.app) {
      return {
        successCount: 0,
        failureCount: tokens.length,
        errors: ['FCM provider not initialized'],
      };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl,
        },
        data: notification.data,
        android: {
          priority: notification.priority === 'high' ? 'high' : 'normal',
          notification: {
            sound: 'default',
            channelId: 'serverhubx_alerts',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging(this.app).sendEachForMulticast(message);

      const errors: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          errors.push(`Token ${idx}: ${resp.error.message}`);
        }
      });

      this.logger.debug(
        `FCM multicast: ${response.successCount} success, ${response.failureCount} failures`,
      );

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        errors,
      };
    } catch (error) {
      this.logger.error('Failed to send FCM multicast', error);
      return {
        successCount: 0,
        failureCount: tokens.length,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  async sendToTopic(
    topic: string,
    notification: Omit<FcmNotification, 'token'>,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.initialized || !this.app) {
      return {
        success: false,
        error: 'FCM provider not initialized',
      };
    }

    try {
      const message: admin.messaging.Message = {
        topic,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl,
        },
        data: notification.data,
        android: {
          priority: notification.priority === 'high' ? 'high' : 'normal',
        },
      };

      const messageId = await admin.messaging(this.app).send(message);

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      this.logger.error('Failed to send FCM topic message', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async subscribeToTopic(tokens: string[], topic: string): Promise<boolean> {
    if (!this.initialized || !this.app) {
      return false;
    }

    try {
      await admin.messaging(this.app).subscribeToTopic(tokens, topic);
      return true;
    } catch (error) {
      this.logger.error(`Failed to subscribe to topic ${topic}`, error);
      return false;
    }
  }

  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<boolean> {
    if (!this.initialized || !this.app) {
      return false;
    }

    try {
      await admin.messaging(this.app).unsubscribeFromTopic(tokens, topic);
      return true;
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from topic ${topic}`, error);
      return false;
    }
  }

  isConfigured(): boolean {
    return this.initialized;
  }
}
