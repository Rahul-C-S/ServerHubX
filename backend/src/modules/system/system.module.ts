import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoreModule } from '../../core/core.module.js';
import { CsfInstallerService } from './csf-installer.service.js';
import { CsfService } from './csf.service.js';
import { CsfLfdService } from './csf-lfd.service.js';
import { SshSecurityService } from './ssh-security.service.js';
import { SystemInfoService } from './system-info.service.js';
import { SettingsService } from './settings.service.js';
import { FirewallController } from './firewall.controller.js';
import { SshController } from './ssh.controller.js';
import { SystemController } from './system.controller.js';
import { FirewallRule } from './entities/firewall-rule.entity.js';
import { SystemSetting } from './entities/system-setting.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([FirewallRule, SystemSetting]),
    CoreModule,
  ],
  providers: [
    CsfInstallerService,
    CsfService,
    CsfLfdService,
    SshSecurityService,
    SystemInfoService,
    SettingsService,
  ],
  controllers: [FirewallController, SshController, SystemController],
  exports: [
    CsfService,
    CsfInstallerService,
    CsfLfdService,
    SshSecurityService,
    SystemInfoService,
    SettingsService,
  ],
})
export class SystemModule {}
