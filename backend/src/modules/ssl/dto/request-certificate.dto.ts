import { IsString, IsOptional, IsArray, IsBoolean, IsEnum } from 'class-validator';

export enum ChallengeType {
  HTTP_01 = 'HTTP_01',
  DNS_01 = 'DNS_01',
}

export class RequestCertificateDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  altNames?: string[];

  @IsOptional()
  @IsEnum(ChallengeType)
  challengeType?: ChallengeType = ChallengeType.HTTP_01;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean = true;
}

export class UploadCertificateDto {
  @IsString()
  certificate!: string;

  @IsString()
  privateKey!: string;

  @IsOptional()
  @IsString()
  chain?: string;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean = false;
}

export class RenewCertificateDto {
  @IsOptional()
  @IsBoolean()
  force?: boolean = false;
}
