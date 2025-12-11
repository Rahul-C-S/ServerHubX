import { IsString, IsNumber, IsEnum, IsOptional, IsIP, Min, Max, IsBoolean } from 'class-validator';
import { FirewallProtocol, FirewallDirection } from '../entities/firewall-rule.entity.js';

export class AllowPortDto {
  @IsNumber()
  @Min(1)
  @Max(65535)
  port!: number;

  @IsEnum(FirewallProtocol)
  @IsOptional()
  protocol?: FirewallProtocol = FirewallProtocol.TCP;

  @IsEnum(FirewallDirection)
  @IsOptional()
  direction?: FirewallDirection = FirewallDirection.BOTH;

  @IsString()
  @IsOptional()
  comment?: string;
}

export class DenyPortDto {
  @IsNumber()
  @Min(1)
  @Max(65535)
  port!: number;

  @IsEnum(FirewallProtocol)
  @IsOptional()
  protocol?: FirewallProtocol = FirewallProtocol.TCP;

  @IsEnum(FirewallDirection)
  @IsOptional()
  direction?: FirewallDirection = FirewallDirection.BOTH;
}

export class AllowIpDto {
  @IsIP()
  ip!: string;

  @IsString()
  @IsOptional()
  comment?: string;
}

export class BlockIpDto {
  @IsIP()
  ip!: string;

  @IsString()
  @IsOptional()
  comment?: string;
}

export class TempBlockIpDto {
  @IsIP()
  ip!: string;

  @IsNumber()
  @Min(60)
  @Max(31536000) // Max 1 year
  ttlSeconds!: number;

  @IsString()
  @IsOptional()
  comment?: string;
}

export class UpdateLfdSettingsDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  loginFailureTrigger?: number;

  @IsNumber()
  @IsOptional()
  @Min(60)
  loginFailureInterval?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  sshFailureLimit?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  ftpFailureLimit?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  smtpAuthFailureLimit?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  imapFailureLimit?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  pop3FailureLimit?: number;
}

export class IgnoreIpDto {
  @IsIP()
  ip!: string;

  @IsString()
  @IsOptional()
  comment?: string;
}

export class ConfigureCSFDto {
  @IsString()
  @IsOptional()
  tcpIn?: string;

  @IsString()
  @IsOptional()
  tcpOut?: string;

  @IsString()
  @IsOptional()
  udpIn?: string;

  @IsString()
  @IsOptional()
  udpOut?: string;

  @IsBoolean()
  @IsOptional()
  testing?: boolean;
}
