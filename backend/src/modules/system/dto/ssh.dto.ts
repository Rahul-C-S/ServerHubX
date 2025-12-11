import { IsString, IsNumber, IsBoolean, IsOptional, IsIn, Min, Max } from 'class-validator';

export class ChangeSSHPortDto {
  @IsNumber()
  @Min(1)
  @Max(65535)
  port!: number;
}

export class UpdateSSHSecurityDto {
  @IsString()
  @IsOptional()
  @IsIn(['yes', 'no', 'prohibit-password'])
  permitRootLogin?: 'yes' | 'no' | 'prohibit-password';

  @IsBoolean()
  @IsOptional()
  passwordAuthentication?: boolean;

  @IsBoolean()
  @IsOptional()
  pubkeyAuthentication?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(20)
  maxAuthTries?: number;

  @IsNumber()
  @IsOptional()
  @Min(30)
  @Max(600)
  loginGraceTime?: number;
}
