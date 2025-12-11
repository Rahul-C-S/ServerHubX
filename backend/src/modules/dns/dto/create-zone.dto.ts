import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateZoneDto {
  @IsString()
  @MaxLength(253)
  @Matches(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/, {
    message: 'Zone name must be a valid domain name',
  })
  zoneName!: string;

  @IsInt()
  @Min(60)
  @Max(604800)
  @IsOptional()
  ttl?: number;

  @IsString()
  @MaxLength(253)
  @IsOptional()
  primaryNs?: string;

  @IsString()
  @MaxLength(253)
  @IsOptional()
  adminEmail?: string;

  @IsInt()
  @Min(60)
  @Max(604800)
  @IsOptional()
  soaRefresh?: number;

  @IsInt()
  @Min(60)
  @Max(604800)
  @IsOptional()
  soaRetry?: number;

  @IsInt()
  @Min(60)
  @Max(2419200)
  @IsOptional()
  soaExpire?: number;

  @IsInt()
  @Min(60)
  @Max(604800)
  @IsOptional()
  soaMinimum?: number;

  @IsUUID()
  @IsOptional()
  domainId?: string;
}

export class UpdateZoneDto {
  @IsInt()
  @Min(60)
  @Max(604800)
  @IsOptional()
  ttl?: number;

  @IsString()
  @MaxLength(253)
  @IsOptional()
  primaryNs?: string;

  @IsString()
  @MaxLength(253)
  @IsOptional()
  adminEmail?: string;

  @IsInt()
  @Min(60)
  @Max(604800)
  @IsOptional()
  soaRefresh?: number;

  @IsInt()
  @Min(60)
  @Max(604800)
  @IsOptional()
  soaRetry?: number;

  @IsInt()
  @Min(60)
  @Max(2419200)
  @IsOptional()
  soaExpire?: number;

  @IsInt()
  @Min(60)
  @Max(604800)
  @IsOptional()
  soaMinimum?: number;
}
