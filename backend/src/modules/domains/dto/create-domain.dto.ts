import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  Matches,
  Length,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WebServer, RuntimeType } from '../entities/domain.entity.js';

export class CreateDomainDto {
  @ApiProperty({
    description: 'Domain name (e.g., example.com)',
    example: 'example.com',
    minLength: 4,
    maxLength: 253,
  })
  @IsString()
  @Length(4, 253)
  @Matches(/^[a-z0-9][a-z0-9.-]{2,251}[a-z0-9]$/, {
    message: 'Invalid domain name format',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Web server to use',
    enum: WebServer,
    default: WebServer.APACHE,
  })
  @IsOptional()
  @IsEnum(WebServer)
  webServer?: WebServer;

  @ApiPropertyOptional({
    description: 'Runtime type for the domain',
    enum: RuntimeType,
    default: RuntimeType.PHP,
  })
  @IsOptional()
  @IsEnum(RuntimeType)
  runtimeType?: RuntimeType;

  @ApiPropertyOptional({
    description: 'PHP version if runtime is PHP',
    example: '8.2',
    pattern: '^(7\\.4|8\\.[0-3])$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^(7\.4|8\.[0-3])$/, {
    message: 'PHP version must be 7.4, 8.0, 8.1, 8.2, or 8.3',
  })
  phpVersion?: string;

  @ApiPropertyOptional({
    description: 'Node.js version if runtime is Node',
    example: '20',
    pattern: '^(18|20|22|24)$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^(18|20|22|24)$/, {
    message: 'Node version must be 18, 20, 22, or 24',
  })
  nodeVersion?: string;

  @ApiPropertyOptional({
    description: 'Redirect www to non-www (or vice versa)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  wwwRedirect?: boolean;

  @ApiPropertyOptional({
    description: 'Custom error pages configuration',
    example: { '404': '/errors/404.html', '500': '/errors/500.html' },
  })
  @IsOptional()
  @IsObject()
  customErrorPages?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Owner user ID (auto-set to current user if not specified)',
  })
  @IsOptional()
  @IsString()
  ownerId?: string;
}
