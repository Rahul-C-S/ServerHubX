import {
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class EnvVariableDto {
  @IsString()
  @MaxLength(255)
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message: 'Environment variable key must be uppercase with underscores only',
  })
  key!: string;

  @IsString()
  @MaxLength(10000)
  value!: string;

  @IsOptional()
  @IsBoolean()
  isSecret?: boolean;
}

export class SetEnvDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnvVariableDto)
  variables!: EnvVariableDto[];
}

export class DeleteEnvDto {
  @IsArray()
  @IsString({ each: true })
  keys!: string[];
}
