import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEmail,
  IsArray,
  IsDate,
  MinLength,
  MaxLength,
  Min,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMailboxDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  @Matches(/^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$/, {
    message: 'Local part must be lowercase alphanumeric with optional dots, underscores, or hyphens',
  })
  localPart!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  quotaBytes?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsBoolean()
  forwardingEnabled?: boolean = false;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  forwardingAddresses?: string[];

  @IsOptional()
  @IsBoolean()
  keepLocalCopy?: boolean = true;

  @IsOptional()
  @IsBoolean()
  autoReplyEnabled?: boolean = false;

  @IsOptional()
  @IsString()
  autoReplySubject?: string;

  @IsOptional()
  @IsString()
  autoReplyMessage?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  autoReplyStartDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  autoReplyEndDate?: Date;
}

export class UpdateMailboxDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  quotaBytes?: number;

  @IsOptional()
  @IsBoolean()
  forwardingEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  forwardingAddresses?: string[];

  @IsOptional()
  @IsBoolean()
  keepLocalCopy?: boolean;

  @IsOptional()
  @IsBoolean()
  autoReplyEnabled?: boolean;

  @IsOptional()
  @IsString()
  autoReplySubject?: string;

  @IsOptional()
  @IsString()
  autoReplyMessage?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  autoReplyStartDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  autoReplyEndDate?: Date;
}
