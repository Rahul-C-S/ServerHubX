import { IsString, IsOptional, IsBoolean, Matches, MaxLength, MinLength } from 'class-validator';

export class ListDirectoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  targetUsername?: string;

  @IsOptional()
  @IsBoolean()
  showHidden?: boolean;
}

export class ReadFileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  path!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  targetUsername?: string;
}

export class WriteFileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  path!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  targetUsername?: string;
}

export class CreateFileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  path!: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  targetUsername?: string;
}

export class CreateDirectoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  path!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  targetUsername?: string;
}

export class DeleteFileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  path!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  targetUsername?: string;
}

export class DeleteDirectoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  path!: string;

  @IsOptional()
  @IsBoolean()
  recursive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  targetUsername?: string;
}

export class MoveFileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  sourcePath!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  destPath!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  targetUsername?: string;
}

export class CopyFileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  sourcePath!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  destPath!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  targetUsername?: string;
}

export class ExtractArchiveDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  archivePath!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  destPath?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  targetUsername?: string;
}

export class SetPermissionsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  path!: string;

  @IsString()
  @Matches(/^[0-7]{3,4}$/, { message: 'Permissions must be in octal format (e.g., 755)' })
  permissions!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  targetUsername?: string;
}

export class SetOwnershipDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  path!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  owner!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  group?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  targetUsername?: string;
}

export class UploadFileDto {
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  targetUsername?: string;
}

export class DownloadFileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  path!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  targetUsername?: string;
}
