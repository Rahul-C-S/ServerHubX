import {
  IsString,
  IsBoolean,
  IsOptional,
  IsInt,
  IsUUID,
  IsObject,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class CreateCronJobDto {
  @IsUUID()
  domainId!: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsString()
  @MaxLength(100)
  schedule!: string;

  @IsString()
  command!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(3600)
  timeoutSeconds?: number;

  @IsOptional()
  @IsBoolean()
  notifyOnFailure?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyOnSuccess?: boolean;

  @IsOptional()
  @IsObject()
  environment?: Record<string, string>;
}

export class UpdateCronJobDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  schedule?: string;

  @IsOptional()
  @IsString()
  command?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(3600)
  timeoutSeconds?: number;

  @IsOptional()
  @IsBoolean()
  notifyOnFailure?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyOnSuccess?: boolean;

  @IsOptional()
  @IsObject()
  environment?: Record<string, string>;
}
