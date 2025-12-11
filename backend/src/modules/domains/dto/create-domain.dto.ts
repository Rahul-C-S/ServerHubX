import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  Matches,
  Length,
  IsObject,
} from 'class-validator';
import { WebServer, RuntimeType } from '../entities/domain.entity.js';

export class CreateDomainDto {
  @IsString()
  @Length(4, 253)
  @Matches(/^[a-z0-9][a-z0-9.-]{2,251}[a-z0-9]$/, {
    message: 'Invalid domain name format',
  })
  name!: string;

  @IsOptional()
  @IsEnum(WebServer)
  webServer?: WebServer;

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
  wwwRedirect?: boolean;

  @IsOptional()
  @IsObject()
  customErrorPages?: Record<string, string>;

  @IsOptional()
  @IsString()
  ownerId?: string;
}
