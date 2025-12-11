import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  Matches,
  IsObject,
} from 'class-validator';
import { DomainStatus, RuntimeType } from '../entities/domain.entity.js';

export class UpdateDomainDto {
  @IsOptional()
  @IsEnum(DomainStatus)
  status?: DomainStatus;

  @IsOptional()
  @IsEnum(RuntimeType)
  runtimeType?: RuntimeType;

  @IsOptional()
  @IsString()
  @Matches(/^(7\.4|8\.[0-3])$/, {
    message: 'PHP version must be 7.4, 8.0, 8.1, 8.2, or 8.3',
  })
  phpVersion?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(18|20|22|24)$/, {
    message: 'Node version must be 18, 20, 22, or 24',
  })
  nodeVersion?: string;

  @IsOptional()
  @IsBoolean()
  sslEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  forceHttps?: boolean;

  @IsOptional()
  @IsBoolean()
  wwwRedirect?: boolean;

  @IsOptional()
  @IsObject()
  customErrorPages?: Record<string, string>;

  @IsOptional()
  @IsString()
  extraApacheConfig?: string;
}
