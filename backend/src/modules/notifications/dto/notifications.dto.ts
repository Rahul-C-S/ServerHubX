import { IsString, IsBoolean, IsOptional, IsObject, IsEnum, IsArray } from 'class-validator';

export class EmailConfigDto {
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsBoolean()
  digestMode?: boolean;

  @IsOptional()
  @IsEnum(['hourly', 'daily', 'weekly'])
  digestFrequency?: 'hourly' | 'daily' | 'weekly';
}

export class SmsConfigDto {
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  countryCode?: string;
}

export class WebhookConfigDto {
  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  secret?: string;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  @IsEnum(['json', 'slack', 'discord'])
  format?: 'json' | 'slack' | 'discord';
}

export class SchedulePreferencesDto {
  @IsOptional()
  @IsBoolean()
  quietHoursEnabled?: boolean;

  @IsOptional()
  @IsString()
  quietHoursStart?: string;

  @IsOptional()
  @IsString()
  quietHoursEnd?: string;

  @IsOptional()
  @IsString()
  quietHoursTimezone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  quietHoursSeverityOverride?: string[];
}

export class SeverityFiltersDto {
  @IsOptional()
  @IsBoolean()
  info?: boolean;

  @IsOptional()
  @IsBoolean()
  warning?: boolean;

  @IsOptional()
  @IsBoolean()
  critical?: boolean;
}

export class UpdatePreferencesDto {
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  fcmEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  whatsappEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  webhookEnabled?: boolean;

  @IsOptional()
  @IsObject()
  emailConfig?: EmailConfigDto;

  @IsOptional()
  @IsObject()
  smsConfig?: SmsConfigDto;

  @IsOptional()
  @IsObject()
  webhookConfig?: WebhookConfigDto;

  @IsOptional()
  @IsObject()
  schedulePreferences?: SchedulePreferencesDto;

  @IsOptional()
  @IsObject()
  severityFilters?: SeverityFiltersDto;
}
