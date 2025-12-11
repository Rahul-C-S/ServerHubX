import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsArray,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
  ArrayMinSize,
} from 'class-validator';
import { AliasType } from '../entities/mail-alias.entity.js';

export class CreateMailAliasDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  @Matches(/^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$|^@$/, {
    message: 'Source must be lowercase alphanumeric with optional dots, underscores, or hyphens, or @ for catch-all',
  })
  source!: string; // Local part only, domain is added from context

  @IsArray()
  @ArrayMinSize(1)
  @IsEmail({}, { each: true })
  destinations!: string[];

  @IsOptional()
  @IsEnum(AliasType)
  type?: AliasType = AliasType.FORWARD;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class UpdateMailAliasDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEmail({}, { each: true })
  destinations?: string[];

  @IsOptional()
  @IsEnum(AliasType)
  type?: AliasType;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
