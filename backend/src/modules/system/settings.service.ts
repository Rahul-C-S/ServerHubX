import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from './entities/system-setting.entity.js';

export interface SettingValue {
  key: string;
  value: string | number | boolean | object;
  valueType: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  isSecret: boolean;
}

const DEFAULT_SETTINGS: Omit<SettingValue, 'isSecret'>[] = [
  { key: 'site.name', value: 'ServerHubX', valueType: 'string', description: 'Site display name' },
  { key: 'site.url', value: 'http://localhost:3000', valueType: 'string', description: 'Site URL' },
  { key: 'site.timezone', value: 'UTC', valueType: 'string', description: 'Server timezone' },
  { key: 'security.session_timeout', value: 3600, valueType: 'number', description: 'Session timeout in seconds' },
  { key: 'security.max_login_attempts', value: 5, valueType: 'number', description: 'Max login attempts before lockout' },
  { key: 'security.lockout_duration', value: 900, valueType: 'number', description: 'Account lockout duration in seconds' },
  { key: 'backup.default_retention', value: 30, valueType: 'number', description: 'Default backup retention days' },
  { key: 'backup.max_concurrent', value: 2, valueType: 'number', description: 'Max concurrent backup jobs' },
  { key: 'monitoring.metrics_interval', value: 10, valueType: 'number', description: 'Metrics collection interval in seconds' },
  { key: 'monitoring.alert_check_interval', value: 30, valueType: 'number', description: 'Alert rule check interval in seconds' },
  { key: 'ssh.default_port', value: 8130, valueType: 'number', description: 'Default SSH port for new installations' },
  { key: 'domain.default_php_version', value: '8.2', valueType: 'string', description: 'Default PHP version for new domains' },
  { key: 'domain.default_document_root', value: 'public_html', valueType: 'string', description: 'Default document root folder name' },
  { key: 'mail.enabled', value: true, valueType: 'boolean', description: 'Enable mail server features' },
  { key: 'dns.enabled', value: true, valueType: 'boolean', description: 'Enable DNS management features' },
];

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private cache: Map<string, SettingValue> = new Map();
  private cacheLoaded = false;

  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingsRepo: Repository<SystemSetting>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.loadCache();
    await this.ensureDefaults();
  }

  private async loadCache(): Promise<void> {
    try {
      const settings = await this.settingsRepo.find();
      this.cache.clear();
      for (const setting of settings) {
        this.cache.set(setting.key, {
          key: setting.key,
          value: this.parseValue(setting.value, setting.valueType),
          valueType: setting.valueType,
          description: setting.description,
          isSecret: setting.isSecret,
        });
      }
      this.cacheLoaded = true;
    } catch (error) {
      this.logger.error(`Failed to load settings cache: ${error}`);
    }
  }

  private async ensureDefaults(): Promise<void> {
    for (const defaultSetting of DEFAULT_SETTINGS) {
      const existing = await this.settingsRepo.findOne({ where: { key: defaultSetting.key } });
      if (!existing) {
        await this.settingsRepo.save({
          key: defaultSetting.key,
          value: this.stringifyValue(defaultSetting.value, defaultSetting.valueType),
          valueType: defaultSetting.valueType,
          description: defaultSetting.description,
          isSecret: false,
        });
      }
    }
    await this.loadCache();
  }

  private parseValue(value: string, valueType: string): string | number | boolean | object {
    switch (valueType) {
      case 'number':
        return parseFloat(value);
      case 'boolean':
        return value === 'true' || value === '1';
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return {};
        }
      default:
        return value;
    }
  }

  private stringifyValue(value: string | number | boolean | object, valueType: string): string {
    switch (valueType) {
      case 'number':
        return String(value);
      case 'boolean':
        return value ? 'true' : 'false';
      case 'json':
        return JSON.stringify(value);
      default:
        return String(value);
    }
  }

  async get<T = string>(key: string, defaultValue?: T): Promise<T> {
    if (!this.cacheLoaded) {
      await this.loadCache();
    }

    const cached = this.cache.get(key);
    if (cached) {
      return cached.value as T;
    }

    const setting = await this.settingsRepo.findOne({ where: { key } });
    if (setting) {
      const value = this.parseValue(setting.value, setting.valueType);
      this.cache.set(key, {
        key: setting.key,
        value,
        valueType: setting.valueType,
        description: setting.description,
        isSecret: setting.isSecret,
      });
      return value as T;
    }

    return defaultValue as T;
  }

  async getString(key: string, defaultValue = ''): Promise<string> {
    return this.get<string>(key, defaultValue);
  }

  async getNumber(key: string, defaultValue = 0): Promise<number> {
    return this.get<number>(key, defaultValue);
  }

  async getBoolean(key: string, defaultValue = false): Promise<boolean> {
    return this.get<boolean>(key, defaultValue);
  }

  async getJson<T = object>(key: string, defaultValue?: T): Promise<T> {
    return this.get<T>(key, defaultValue as T);
  }

  async set(
    key: string,
    value: string | number | boolean | object,
    options?: {
      valueType?: 'string' | 'number' | 'boolean' | 'json';
      description?: string;
      isSecret?: boolean;
    },
  ): Promise<void> {
    const valueType = options?.valueType || this.inferValueType(value);
    const stringValue = this.stringifyValue(value, valueType);

    let setting = await this.settingsRepo.findOne({ where: { key } });

    if (setting) {
      setting.value = stringValue;
      setting.valueType = valueType;
      if (options?.description !== undefined) {
        setting.description = options.description;
      }
      if (options?.isSecret !== undefined) {
        setting.isSecret = options.isSecret;
      }
    } else {
      setting = this.settingsRepo.create({
        key,
        value: stringValue,
        valueType,
        description: options?.description,
        isSecret: options?.isSecret || false,
      });
    }

    await this.settingsRepo.save(setting);

    // Update cache
    this.cache.set(key, {
      key,
      value,
      valueType,
      description: setting.description,
      isSecret: setting.isSecret,
    });

    this.logger.log(`Setting updated: ${key}`);
  }

  private inferValueType(value: string | number | boolean | object): 'string' | 'number' | 'boolean' | 'json' {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'object') return 'json';
    return 'string';
  }

  async delete(key: string): Promise<boolean> {
    const result = await this.settingsRepo.delete({ key });
    this.cache.delete(key);
    return (result.affected || 0) > 0;
  }

  async getAll(includeSecrets = false): Promise<SettingValue[]> {
    const settings = await this.settingsRepo.find({
      order: { key: 'ASC' },
    });

    return settings.map(setting => ({
      key: setting.key,
      value: setting.isSecret && !includeSecrets ? '********' : this.parseValue(setting.value, setting.valueType),
      valueType: setting.valueType,
      description: setting.description,
      isSecret: setting.isSecret,
    }));
  }

  async getByPrefix(prefix: string, includeSecrets = false): Promise<SettingValue[]> {
    const settings = await this.settingsRepo
      .createQueryBuilder('setting')
      .where('setting.key LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('setting.key', 'ASC')
      .getMany();

    return settings.map(setting => ({
      key: setting.key,
      value: setting.isSecret && !includeSecrets ? '********' : this.parseValue(setting.value, setting.valueType),
      valueType: setting.valueType,
      description: setting.description,
      isSecret: setting.isSecret,
    }));
  }

  async setMultiple(settings: Array<{ key: string; value: string | number | boolean | object }>): Promise<void> {
    for (const { key, value } of settings) {
      await this.set(key, value);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (this.cache.has(key)) return true;
    const count = await this.settingsRepo.count({ where: { key } });
    return count > 0;
  }

  async clearCache(): Promise<void> {
    this.cache.clear();
    this.cacheLoaded = false;
    await this.loadCache();
  }
}
