import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsUUID,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { AlertSeverity, AlertMetric, AlertOperator, AlertScope } from '../entities/alert-rule.entity';

export class NotificationOverridesDto {
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @IsOptional()
  @IsBoolean()
  sms?: boolean;

  @IsOptional()
  @IsBoolean()
  fcm?: boolean;

  @IsOptional()
  @IsBoolean()
  whatsapp?: boolean;

  @IsOptional()
  @IsBoolean()
  webhook?: boolean;

  @IsOptional()
  @IsString()
  webhookUrl?: string;
}

export class CreateAlertRuleDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(AlertScope)
  scope!: AlertScope;

  @IsEnum(AlertMetric)
  metric!: AlertMetric;

  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @IsNumber()
  threshold!: number;

  @IsOptional()
  @IsEnum(AlertOperator)
  operator?: AlertOperator;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(3600)
  durationSeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(60)
  @Max(86400)
  cooldownSeconds?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  serviceName?: string;

  @IsOptional()
  @IsUUID()
  domainId?: string;

  @IsOptional()
  @IsUUID()
  appId?: string;

  @IsOptional()
  @IsObject()
  notificationOverrides?: NotificationOverridesDto;
}

export class UpdateAlertRuleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @IsOptional()
  @IsNumber()
  threshold?: number;

  @IsOptional()
  @IsEnum(AlertOperator)
  operator?: AlertOperator;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(3600)
  durationSeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(60)
  @Max(86400)
  cooldownSeconds?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  notificationOverrides?: NotificationOverridesDto;
}

export class AcknowledgeAlertDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class MetricsQueryDto {
  @IsOptional()
  @IsNumber()
  startTime?: number;

  @IsOptional()
  @IsNumber()
  endTime?: number;
}
