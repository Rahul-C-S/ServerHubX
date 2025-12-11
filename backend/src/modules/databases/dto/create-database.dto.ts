import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { DatabaseType } from '../entities/database.entity.js';

export class CreateDatabaseDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'Database name must start with a letter and contain only lowercase letters, numbers, and underscores',
  })
  name!: string;

  @IsEnum(DatabaseType)
  @IsOptional()
  type?: DatabaseType;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  charset?: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  collation?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsUUID()
  @IsOptional()
  domainId?: string;

  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(32)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'Username must start with a letter and contain only lowercase letters, numbers, and underscores',
  })
  initialUsername?: string;

  @IsString()
  @IsOptional()
  @MinLength(8)
  @MaxLength(128)
  initialPassword?: string;
}
