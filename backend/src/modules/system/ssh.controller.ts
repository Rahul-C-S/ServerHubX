import {
  Controller,
  Get,
  Put,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../users/entities/user.entity.js';
import { SshSecurityService } from './ssh-security.service.js';
import { ChangeSSHPortDto, UpdateSSHSecurityDto } from './dto/ssh.dto.js';

@ApiTags('SSH')
@ApiBearerAuth('JWT-auth')
@Controller('system/ssh')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ROOT_ADMIN)
export class SshController {
  constructor(private readonly sshSecurityService: SshSecurityService) {}

  @Get('config')
  async getConfig() {
    return this.sshSecurityService.getSSHConfig();
  }

  @Get('port')
  async getPort() {
    const port = await this.sshSecurityService.getSSHPort();
    return { port };
  }

  @Put('port')
  async changePort(@Body() dto: ChangeSSHPortDto) {
    return this.sshSecurityService.changeSSHPort(dto.port);
  }

  @Get('security')
  async getSecuritySettings() {
    return this.sshSecurityService.getSSHSecuritySettings();
  }

  @Patch('security')
  async updateSecuritySettings(@Body() dto: UpdateSSHSecurityDto) {
    return this.sshSecurityService.updateSSHSecuritySettings(dto);
  }

  @Get('connection-info')
  async getConnectionInfo() {
    return this.sshSecurityService.getConnectionInfo();
  }

  @Get('validate')
  async validateConfig() {
    return this.sshSecurityService.validateSSHConfig();
  }
}
