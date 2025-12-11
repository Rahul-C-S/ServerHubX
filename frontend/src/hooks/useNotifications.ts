import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import type { NotificationPreferences, UpdateNotificationPreferencesDto } from '@/types';

// Query Keys
export const notificationKeys = {
  all: ['notifications'] as const,
  preferences: () => [...notificationKeys.all, 'preferences'] as const,
};

// Queries
export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: () => notificationsApi.getPreferences(),
  });
}

// Mutations
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateNotificationPreferencesDto) =>
      notificationsApi.updatePreferences(data),
    onSuccess: (data: NotificationPreferences) => {
      queryClient.setQueryData(notificationKeys.preferences(), data);
    },
  });
}

export function useTestNotificationChannel() {
  return useMutation({
    mutationFn: (channel: 'email' | 'sms' | 'webhook') => notificationsApi.testChannel(channel),
  });
}
