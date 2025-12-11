import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../users/entities/user.entity.js';
import { CsfService } from './csf.service.js';
import { CsfInstallerService } from './csf-installer.service.js';
import { CsfLfdService } from './csf-lfd.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';
import {
  AllowPortDto,
  DenyPortDto,
  AllowIpDto,
  BlockIpDto,
  TempBlockIpDto,
  UpdateLfdSettingsDto,
  IgnoreIpDto,
  ConfigureCSFDto,
} from './dto/firewall.dto.js';

@Controller('system/firewall')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ROOT_ADMIN)
export class FirewallController {
  constructor(
    private readonly csfService: CsfService,
    private readonly csfInstallerService: CsfInstallerService,
    private readonly csfLfdService: CsfLfdService,
  ) {}

  @Get('status')
  async getStatus() {
    const status = await this.csfService.getStatus();
    const lfdStatus = await this.csfLfdService.getStatus();
    const isInstalled = await this.csfInstallerService.isInstalled();
    const version = await this.csfInstallerService.getVersion();

    return {
      isInstalled,
      version,
      csf: status,
      lfd: lfdStatus,
    };
  }

  @Get('ports')
  async getPorts() {
    return this.csfService.getAllowedPorts();
  }

  @Post('ports')
  async allowPort(@Body() dto: AllowPortDto, @CurrentUser() user: User) {
    return this.csfService.allowPort(
      {
        port: dto.port,
        protocol: dto.protocol!,
        direction: dto.direction!,
        comment: dto.comment,
      },
      user.id,
    );
  }

  @Delete('ports/:port')
  async denyPort(@Param('port') port: string, @Body() dto: DenyPortDto) {
    return this.csfService.denyPort(
      parseInt(port, 10),
      dto.protocol,
      dto.direction,
    );
  }

  @Get('ips')
  async getIps() {
    const [allowed, blocked, tempBlocks] = await Promise.all([
      this.csfService.listAllowedIps(),
      this.csfService.listBlockedIps(),
      this.csfService.listTempBlocks(),
    ]);

    return { allowed, blocked, tempBlocks };
  }

  @Post('ips/allow')
  async allowIp(@Body() dto: AllowIpDto, @CurrentUser() user: User) {
    return this.csfService.allowIp(dto.ip, dto.comment, user.id);
  }

  @Post('ips/block')
  async blockIp(@Body() dto: BlockIpDto, @CurrentUser() user: User) {
    return this.csfService.blockIp(dto.ip, dto.comment, user.id);
  }

  @Post('ips/temp-block')
  async tempBlockIp(@Body() dto: TempBlockIpDto, @CurrentUser() user: User) {
    return this.csfService.tempBlockIp(
      dto.ip,
      dto.ttlSeconds,
      dto.comment,
      user.id,
    );
  }

  @Delete('ips/:ip')
  async removeIp(@Param('ip') ip: string) {
    // Try to unblock from all lists
    const unblockResult = await this.csfService.unblockIp(ip);
    const removeFromAllowResult = await this.csfService.removeFromAllowList(ip);

    return {
      success: unblockResult.success || removeFromAllowResult.success,
      message: unblockResult.success
        ? unblockResult.message
        : removeFromAllowResult.message,
    };
  }

  @Get('temp-blocks')
  async getTempBlocks() {
    return this.csfService.listTempBlocks();
  }

  @Post('restart')
  async restart() {
    return this.csfService.restart();
  }

  @Post('reload')
  async reload() {
    return this.csfService.reload();
  }

  @Get('lfd')
  async getLfdStatus() {
    const [status, settings, blockedLogins, ignoredIps] = await Promise.all([
      this.csfLfdService.getStatus(),
      this.csfLfdService.getSettings(),
      this.csfLfdService.getBlockedLogins(),
      this.csfLfdService.listIgnoredIps(),
    ]);

    return { status, settings, blockedLogins, ignoredIps };
  }

  @Patch('lfd')
  async updateLfdSettings(@Body() dto: UpdateLfdSettingsDto) {
    return this.csfLfdService.updateSettings(dto);
  }

  @Post('lfd/ignore')
  async addLfdIgnore(@Body() dto: IgnoreIpDto) {
    return this.csfLfdService.ignoreIp(dto.ip, dto.comment);
  }

  @Delete('lfd/ignore/:ip')
  async removeLfdIgnore(@Param('ip') ip: string) {
    return this.csfLfdService.removeIgnoredIp(ip);
  }

  @Post('lfd/restart')
  async restartLfd() {
    return this.csfLfdService.restart();
  }

  @Get('rules')
  async getFirewallRules() {
    return this.csfService.getFirewallRules();
  }

  @Post('install')
  async installCSF() {
    return this.csfInstallerService.installCSF();
  }

  @Post('configure')
  async configureCSF(@Body() dto: ConfigureCSFDto) {
    return this.csfInstallerService.configureCSF(dto);
  }

  @Post('enable')
  async enableCSF() {
    return this.csfInstallerService.enableCSF();
  }

  @Post('disable')
  async disableCSF() {
    return this.csfInstallerService.disableCSF();
  }
}
