import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  Matches,
  Length,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { RuntimeType } from '../entities/domain.entity.js';

export class CreateSubdomainDto {
  @IsString()
  @Length(1, 63)
  @Matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/, {
    message: 'Invalid subdomain name format',
  })
  name!: string;

  @IsString()
  domainId!: string;

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
  isWildcard?: boolean;

  @IsOptional()
  @IsInt()
  @Min(3000)
  @Max(65535)
  appPort?: number;
}
