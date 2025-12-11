import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';

export class CreateMailDomainDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxMailboxes?: number = 0;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxAliases?: number = 0;

  @IsOptional()
  @IsInt()
  @Min(0)
  defaultQuotaBytes?: number;

  @IsOptional()
  @IsBoolean()
  dkimEnabled?: boolean = false;

  @IsOptional()
  @IsBoolean()
  spamFilterEnabled?: boolean = true;

  @IsOptional()
  @IsBoolean()
  virusScanEnabled?: boolean = true;

  @IsOptional()
  @IsBoolean()
  catchAllEnabled?: boolean = false;

  @IsOptional()
  @IsString()
  catchAllAddress?: string;
}

export class UpdateMailDomainDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxMailboxes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxAliases?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  defaultQuotaBytes?: number;

  @IsOptional()
  @IsBoolean()
  dkimEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  spamFilterEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  virusScanEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  catchAllEnabled?: boolean;

  @IsOptional()
  @IsString()
  catchAllAddress?: string;
}
