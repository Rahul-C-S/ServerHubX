import {
  IsString,
  IsOptional,
  Length,
  Matches,
  IsDateString,
} from 'class-validator';

export class AddSSHKeyDto {
  @IsString()
  @Length(1, 255)
  name!: string;

  @IsString()
  @Matches(/^(ssh-rsa|ssh-ed25519|ecdsa-sha2-nistp256|ecdsa-sha2-nistp384|ecdsa-sha2-nistp521|ssh-dss)\s+[A-Za-z0-9+/=]+/, {
    message: 'Invalid SSH public key format',
  })
  publicKey!: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
