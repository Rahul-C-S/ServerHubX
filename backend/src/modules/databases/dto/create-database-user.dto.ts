import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsInt,
  Min,
  Max,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { DatabasePrivilege } from '../entities/database-user.entity.js';

export class CreateDatabaseUserDto {
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'Username must start with a letter and contain only lowercase letters, numbers, and underscores',
  })
  username!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsString()
  @IsOptional()
  @MaxLength(60)
  host?: string;

  @IsArray()
  @IsOptional()
  privileges?: DatabasePrivilege[];

  @IsBoolean()
  @IsOptional()
  canGrant?: boolean;

  @IsInt()
  @Min(0)
  @Max(10000)
  @IsOptional()
  maxConnections?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  maxQueriesPerHour?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  maxUpdatesPerHour?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  maxConnectionsPerHour?: number;
}

export class UpdateDatabaseUserDto {
  @IsString()
  @IsOptional()
  @MinLength(8)
  @MaxLength(128)
  password?: string;

  @IsArray()
  @IsOptional()
  privileges?: DatabasePrivilege[];

  @IsBoolean()
  @IsOptional()
  canGrant?: boolean;

  @IsInt()
  @Min(0)
  @Max(10000)
  @IsOptional()
  maxConnections?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  maxQueriesPerHour?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  maxUpdatesPerHour?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  maxConnectionsPerHour?: number;
}
