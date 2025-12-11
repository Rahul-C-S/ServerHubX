import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { DnsRecordType } from '../entities/dns-record.entity.js';

export class CreateRecordDto {
  @IsString()
  @MaxLength(253)
  name!: string;

  @IsEnum(DnsRecordType)
  type!: DnsRecordType;

  @IsString()
  @MaxLength(4096)
  value!: string;

  @IsInt()
  @Min(60)
  @Max(604800)
  @IsOptional()
  ttl?: number;

  @IsInt()
  @Min(0)
  @Max(65535)
  @IsOptional()
  priority?: number;

  // SRV specific
  @IsInt()
  @Min(0)
  @Max(65535)
  @IsOptional()
  weight?: number;

  @IsInt()
  @Min(0)
  @Max(65535)
  @IsOptional()
  port?: number;

  // CAA specific
  @IsString()
  @MaxLength(32)
  @IsOptional()
  flag?: string;

  @IsString()
  @MaxLength(32)
  @IsOptional()
  tag?: string;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  comment?: string;
}

export class UpdateRecordDto {
  @IsString()
  @MaxLength(253)
  @IsOptional()
  name?: string;

  @IsString()
  @MaxLength(4096)
  @IsOptional()
  value?: string;

  @IsInt()
  @Min(60)
  @Max(604800)
  @IsOptional()
  ttl?: number;

  @IsInt()
  @Min(0)
  @Max(65535)
  @IsOptional()
  priority?: number;

  @IsInt()
  @Min(0)
  @Max(65535)
  @IsOptional()
  weight?: number;

  @IsInt()
  @Min(0)
  @Max(65535)
  @IsOptional()
  port?: number;

  @IsString()
  @MaxLength(32)
  @IsOptional()
  flag?: string;

  @IsString()
  @MaxLength(32)
  @IsOptional()
  tag?: string;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  comment?: string;
}
