import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsArray,
  IsObject,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BackupType, StorageType } from '../entities/backup.entity';

export class StorageConfigDto {
  @IsOptional()
  @IsString()
  localPath?: string;

  @IsOptional()
  @IsString()
  s3Bucket?: string;

  @IsOptional()
  @IsString()
  s3Region?: string;

  @IsOptional()
  @IsString()
  s3AccessKey?: string;

  @IsOptional()
  @IsString()
  s3SecretKey?: string;

  @IsOptional()
  @IsString()
  s3Endpoint?: string;

  @IsOptional()
  @IsString()
  sftpHost?: string;

  @IsOptional()
  @IsInt()
  sftpPort?: number;

  @IsOptional()
  @IsString()
  sftpUsername?: string;

  @IsOptional()
  @IsString()
  sftpPassword?: string;

  @IsOptional()
  @IsString()
  sftpPrivateKey?: string;

  @IsOptional()
  @IsString()
  sftpPath?: string;
}

export class BackupOptionsDto {
  @IsOptional()
  @IsBoolean()
  includeDatabases?: boolean;

  @IsOptional()
  @IsBoolean()
  includeFiles?: boolean;

  @IsOptional()
  @IsBoolean()
  includeMail?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludePaths?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9)
  compressionLevel?: number;

  @IsOptional()
  @IsBoolean()
  encryptBackup?: boolean;

  @IsOptional()
  @IsString()
  encryptionKey?: string;

  @IsOptional()
  @IsBoolean()
  notifyOnComplete?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyOnFailure?: boolean;
}

export class CreateBackupDto {
  @IsUUID()
  domainId!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(BackupType)
  type?: BackupType;

  @IsOptional()
  @IsEnum(StorageType)
  storageType?: StorageType;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => StorageConfigDto)
  storageConfig?: StorageConfigDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BackupOptionsDto)
  options?: BackupOptionsDto;
}

export class CreateScheduleDto {
  @IsUUID()
  domainId!: string;

  @IsString()
  name!: string;

  @IsString()
  schedule!: string; // cron expression

  @IsOptional()
  @IsEnum(BackupType)
  type?: BackupType;

  @IsOptional()
  @IsEnum(StorageType)
  storageType?: StorageType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  retentionDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxBackups?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => StorageConfigDto)
  storageConfig?: StorageConfigDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BackupOptionsDto)
  options?: BackupOptionsDto;
}

export class UpdateScheduleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  schedule?: string;

  @IsOptional()
  @IsEnum(BackupType)
  type?: BackupType;

  @IsOptional()
  @IsEnum(StorageType)
  storageType?: StorageType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  retentionDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxBackups?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => StorageConfigDto)
  storageConfig?: StorageConfigDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BackupOptionsDto)
  options?: BackupOptionsDto;
}

export class RestoreBackupDto {
  @IsOptional()
  @IsBoolean()
  restoreFiles?: boolean;

  @IsOptional()
  @IsBoolean()
  restoreDatabases?: boolean;

  @IsOptional()
  @IsBoolean()
  restoreMail?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specificPaths?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specificDatabases?: string[];
}
