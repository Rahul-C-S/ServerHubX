import { apiClient } from './client';
import type {
  NotificationPreferences,
  UpdateNotificationPreferencesDto,
  TestChannelResult,
} from '@/types';

export const notificationsApi = {
  getPreferences: async (): Promise<NotificationPreferences> => {
    const response = await apiClient.get<NotificationPreferences>('/notifications/preferences');
    return response.data;
  },

  updatePreferences: async (
    data: UpdateNotificationPreferencesDto
  ): Promise<NotificationPreferences> => {
    const response = await apiClient.patch<NotificationPreferences>(
      '/notifications/preferences',
      data
    );
    return response.data;
  },

  testChannel: async (channel: 'email' | 'sms' | 'webhook'): Promise<TestChannelResult> => {
    const response = await apiClient.post<TestChannelResult>(
      `/notifications/test/${channel}`
    );
    return response.data;
  },
};
