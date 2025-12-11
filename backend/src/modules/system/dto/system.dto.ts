import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class ServiceActionDto {
  @IsString()
  name!: string;
}

export class UpdateSettingDto {
  @IsString()
  key!: string;

  value!: string | number | boolean | object;

  @IsString()
  @IsOptional()
  valueType?: 'string' | 'number' | 'boolean' | 'json';

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isSecret?: boolean;
}

export class UpdateSettingsDto {
  settings!: Array<{ key: string; value: string | number | boolean | object }>;
}
