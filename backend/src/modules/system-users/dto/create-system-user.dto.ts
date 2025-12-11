import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  Matches,
  Length,
} from 'class-validator';

export class CreateSystemUserDto {
  @IsString()
  @Length(3, 32)
  @Matches(/^[a-z][a-z0-9_-]{2,31}$/, {
    message: 'Username must start with lowercase letter and contain only lowercase letters, numbers, underscore, or hyphen',
  })
  username!: string;

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
  @IsInt()
  @Min(0)
  @Max(10485760) // 10TB in MB
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

  @IsOptional()
  @IsString()
  ownerId?: string;
}
