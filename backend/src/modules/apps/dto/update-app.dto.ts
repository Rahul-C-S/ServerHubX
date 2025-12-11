import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsObject,
  MaxLength,
  Min,
  Max,
  Matches,
} from 'class-validator';
import type { Pm2Config } from '../entities/app.entity.js';

export class UpdateAppDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-zA-Z][a-zA-Z0-9_-]*$/, {
    message: 'App name must start with a letter and contain only letters, numbers, underscores, and hyphens',
  })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  framework?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  entryPoint?: string;

  @IsOptional()
  @IsInt()
  @Min(1024)
  @Max(65535)
  port?: number;

  @IsOptional()
  @IsObject()
  pm2Config?: Pm2Config;

  @IsOptional()
  @IsString()
  @Matches(/^(18|20|22|24)$/, { message: 'Invalid Node.js version' })
  nodeVersion?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(7\.4|8\.[0-3])$/, { message: 'Invalid PHP version' })
  phpVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  gitRepository?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  gitBranch?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  buildCommand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  startCommand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  installCommand?: string;

  @IsOptional()
  @IsBoolean()
  autoDeploy?: boolean;
}
