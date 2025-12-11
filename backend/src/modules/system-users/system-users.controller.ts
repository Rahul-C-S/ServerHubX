import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { SystemUsersService } from './system-users.service.js';
import { CreateSystemUserDto } from './dto/create-system-user.dto.js';
import { UpdateSystemUserDto } from './dto/update-system-user.dto.js';
import { AddSSHKeyDto } from './dto/add-ssh-key.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PoliciesGuard } from '../authorization/guards/policies.guard.js';
import { CheckPolicies } from '../authorization/decorators/check-policies.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';

@Controller('system-users')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class SystemUsersController {
  constructor(private readonly systemUsersService: SystemUsersService) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'SystemUser'))
  async create(
    @Body() dto: CreateSystemUserDto,
    @CurrentUser() user: User,
  ) {
    return this.systemUsersService.create(dto, user.id);
  }

  @Get()
  @CheckPolicies((ability) => ability.can('read', 'SystemUser'))
  async findAll(
    @Query('ownerId') ownerId?: string,
    @CurrentUser() user?: User,
  ) {
    // Non-admin users can only see their own system users
    const filterOwnerId = user?.role === 'ROOT_ADMIN' ? ownerId : user?.id;
    return this.systemUsersService.findAll(filterOwnerId);
  }

  @Get(':id')
  @CheckPolicies((ability) => ability.can('read', 'SystemUser'))
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.systemUsersService.findOne(id);
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can('update', 'SystemUser'))
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSystemUserDto,
    @CurrentUser() user: User,
  ) {
    return this.systemUsersService.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPolicies((ability) => ability.can('delete', 'SystemUser'))
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.systemUsersService.delete(id, user.id);
  }

  @Post(':id/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPolicies((ability) => ability.can('update', 'SystemUser'))
  async setPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('password') password: string,
    @CurrentUser() user: User,
  ) {
    await this.systemUsersService.setPassword(id, password, user.id);
  }

  @Get(':id/quota')
  @CheckPolicies((ability) => ability.can('read', 'SystemUser'))
  async getQuotaUsage(@Param('id', ParseUUIDPipe) id: string) {
    return this.systemUsersService.getQuotaUsage(id);
  }

  // SSH Key endpoints
  @Get(':id/ssh-keys')
  @CheckPolicies((ability) => ability.can('read', 'SystemUser'))
  async listSSHKeys(@Param('id', ParseUUIDPipe) id: string) {
    return this.systemUsersService.listSSHKeys(id);
  }

  @Post(':id/ssh-keys')
  @CheckPolicies((ability) => ability.can('update', 'SystemUser'))
  async addSSHKey(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddSSHKeyDto,
    @CurrentUser() user: User,
  ) {
    return this.systemUsersService.addSSHKey(id, dto, user.id);
  }

  @Delete(':id/ssh-keys/:keyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPolicies((ability) => ability.can('update', 'SystemUser'))
  async removeSSHKey(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('keyId', ParseUUIDPipe) keyId: string,
    @CurrentUser() user: User,
  ) {
    await this.systemUsersService.removeSSHKey(id, keyId, user.id);
  }
}
