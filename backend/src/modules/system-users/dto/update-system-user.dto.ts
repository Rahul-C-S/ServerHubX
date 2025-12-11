import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  Matches,
  Length,
  IsEnum,
} from 'class-validator';
import { SystemUserStatus } from '../entities/system-user.entity.js';

export class UpdateSystemUserDto {
  @IsOptional()
  @IsString()
  @Length(8, 128)
  password?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\/bin\/(bash|sh|false|nologin)|\/usr\/sbin\/nologin$/, {
    message: 'Shell must be a valid shell path',
  })
  shell?: string;

  @IsOptional()
  @IsEnum(SystemUserStatus)
  status?: SystemUserStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10485760)
  diskQuotaMb?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000000)
  inodeQuota?: number;

  @IsOptional()
  @IsBoolean()
  sshEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  sftpOnly?: boolean;
}
