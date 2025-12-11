import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../users/entities/user.entity.js';
import { SystemInfoService } from './system-info.service.js';
import { SettingsService } from './settings.service.js';
import { UpdateSettingDto, UpdateSettingsDto } from './dto/system.dto.js';

@ApiTags('System')
@ApiBearerAuth('JWT-auth')
@Controller('system')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemController {
  constructor(
    private readonly systemInfoService: SystemInfoService,
    private readonly settingsService: SettingsService,
  ) {}

  @Get('info')
  @Roles(UserRole.ROOT_ADMIN, UserRole.RESELLER)
  async getInfo() {
    const [osInfo, uptime, loadAvg, memory, disk] = await Promise.all([
      this.systemInfoService.getOsInfo(),
      this.systemInfoService.getUptime(),
      this.systemInfoService.getLoadAverage(),
      this.systemInfoService.getMemoryInfo(),
      this.systemInfoService.getDiskInfo(),
    ]);

    return {
      os: osInfo,
      uptime,
      load: loadAvg,
      memory,
      disk: disk[0] || null,
    };
  }

  @Get('versions')
  @Roles(UserRole.ROOT_ADMIN, UserRole.RESELLER)
  async getVersions() {
    const [phpVersions, nodeVersions] = await Promise.all([
      this.systemInfoService.getInstalledPhpVersions(),
      this.systemInfoService.getInstalledNodeVersions(),
    ]);

    return { php: phpVersions, node: nodeVersions };
  }

  @Get('services')
  @Roles(UserRole.ROOT_ADMIN)
  async getServices() {
    return this.systemInfoService.listServices();
  }

  @Post('services/:name/start')
  @Roles(UserRole.ROOT_ADMIN)
  async startService(@Param('name') name: string) {
    return this.systemInfoService.startService(name);
  }

  @Post('services/:name/stop')
  @Roles(UserRole.ROOT_ADMIN)
  async stopService(@Param('name') name: string) {
    return this.systemInfoService.stopService(name);
  }

  @Post('services/:name/restart')
  @Roles(UserRole.ROOT_ADMIN)
  async restartService(@Param('name') name: string) {
    return this.systemInfoService.restartService(name);
  }

  @Post('services/:name/enable')
  @Roles(UserRole.ROOT_ADMIN)
  async enableService(@Param('name') name: string) {
    return this.systemInfoService.enableService(name);
  }

  @Post('services/:name/disable')
  @Roles(UserRole.ROOT_ADMIN)
  async disableService(@Param('name') name: string) {
    return this.systemInfoService.disableService(name);
  }

  @Get('updates')
  @Roles(UserRole.ROOT_ADMIN)
  async getPackageUpdates() {
    return this.systemInfoService.getPackageUpdates();
  }

  @Get('settings')
  @Roles(UserRole.ROOT_ADMIN)
  async getSettings() {
    return this.settingsService.getAll();
  }

  @Get('settings/:prefix')
  @Roles(UserRole.ROOT_ADMIN)
  async getSettingsByPrefix(@Param('prefix') prefix: string) {
    return this.settingsService.getByPrefix(prefix);
  }

  @Patch('settings')
  @Roles(UserRole.ROOT_ADMIN)
  async updateSetting(@Body() dto: UpdateSettingDto) {
    await this.settingsService.set(dto.key, dto.value, {
      valueType: dto.valueType,
      description: dto.description,
      isSecret: dto.isSecret,
    });
    return { success: true, message: `Setting ${dto.key} updated` };
  }

  @Patch('settings/batch')
  @Roles(UserRole.ROOT_ADMIN)
  async updateSettings(@Body() dto: UpdateSettingsDto) {
    await this.settingsService.setMultiple(dto.settings);
    return { success: true, message: `${dto.settings.length} settings updated` };
  }
}
