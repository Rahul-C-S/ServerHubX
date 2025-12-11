export interface NotificationPreferences {
  id: string;
  userId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  fcmEnabled: boolean;
  whatsappEnabled: boolean;
  webhookEnabled: boolean;
  emailConfig?: {
    address?: string;
    digestMode?: boolean;
    digestFrequency?: 'hourly' | 'daily' | 'weekly';
  };
  smsConfig?: {
    phoneNumber?: string;
    countryCode?: string;
  };
  fcmConfig?: {
    deviceTokens?: string[];
  };
  whatsappConfig?: {
    phoneNumber?: string;
    countryCode?: string;
  };
  webhookConfig?: {
    url?: string;
    secret?: string;
    headers?: Record<string, string>;
    format?: 'json' | 'slack' | 'discord';
  };
  schedulePreferences?: {
    quietHoursEnabled?: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    quietHoursTimezone?: string;
    quietHoursSeverityOverride?: string[];
  };
  severityFilters?: {
    info?: boolean;
    warning?: boolean;
    critical?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UpdateNotificationPreferencesDto {
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  fcmEnabled?: boolean;
  whatsappEnabled?: boolean;
  webhookEnabled?: boolean;
  emailConfig?: NotificationPreferences['emailConfig'];
  smsConfig?: NotificationPreferences['smsConfig'];
  fcmConfig?: NotificationPreferences['fcmConfig'];
  whatsappConfig?: NotificationPreferences['whatsappConfig'];
  webhookConfig?: NotificationPreferences['webhookConfig'];
  schedulePreferences?: NotificationPreferences['schedulePreferences'];
  severityFilters?: NotificationPreferences['severityFilters'];
}

export interface TestChannelResult {
  success: boolean;
  error?: string;
}
