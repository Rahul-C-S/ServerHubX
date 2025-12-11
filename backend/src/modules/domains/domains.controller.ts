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
import { DomainsService } from './domains.service.js';
import { CreateDomainDto } from './dto/create-domain.dto.js';
import { UpdateDomainDto } from './dto/update-domain.dto.js';
import { CreateSubdomainDto } from './dto/create-subdomain.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PoliciesGuard } from '../authorization/guards/policies.guard.js';
import { CheckPolicies } from '../authorization/decorators/check-policies.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { User, UserRole } from '../users/entities/user.entity.js';

@Controller('domains')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'Domain'))
  async create(
    @Body() dto: CreateDomainDto,
    @CurrentUser() user: User,
  ) {
    // Set owner to current user if not specified
    if (!dto.ownerId) {
      dto.ownerId = user.id;
    }
    return this.domainsService.create(dto, user.id);
  }

  @Get()
  @CheckPolicies((ability) => ability.can('read', 'Domain'))
  async findAll(
    @Query('ownerId') ownerId?: string,
    @CurrentUser() user?: User,
  ) {
    // Non-admin users can only see their own domains
    const filterOwnerId = user?.role === UserRole.ROOT_ADMIN ? ownerId : user?.id;
    return this.domainsService.findAll(filterOwnerId);
  }

  @Get(':id')
  @CheckPolicies((ability) => ability.can('read', 'Domain'))
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.domainsService.findOne(id);
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can('update', 'Domain'))
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDomainDto,
    @CurrentUser() user: User,
  ) {
    return this.domainsService.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPolicies((ability) => ability.can('delete', 'Domain'))
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.domainsService.delete(id, user.id);
  }

  @Post(':id/suspend')
  @CheckPolicies((ability) => ability.can('update', 'Domain'))
  async suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.domainsService.suspend(id, user.id);
  }

  @Post(':id/unsuspend')
  @CheckPolicies((ability) => ability.can('update', 'Domain'))
  async unsuspend(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.domainsService.unsuspend(id, user.id);
  }

  @Get(':id/stats')
  @CheckPolicies((ability) => ability.can('read', 'Domain'))
  async getStats(@Param('id', ParseUUIDPipe) id: string) {
    return this.domainsService.getStats(id);
  }

  // Subdomain endpoints
  @Get(':id/subdomains')
  @CheckPolicies((ability) => ability.can('read', 'Domain'))
  async listSubdomains(@Param('id', ParseUUIDPipe) id: string) {
    return this.domainsService.listSubdomains(id);
  }

  @Post(':id/subdomains')
  @CheckPolicies((ability) => ability.can('update', 'Domain'))
  async createSubdomain(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSubdomainDto,
    @CurrentUser() user: User,
  ) {
    dto.domainId = id;
    return this.domainsService.createSubdomain(dto, user.id);
  }

  @Delete(':id/subdomains/:subdomainId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPolicies((ability) => ability.can('update', 'Domain'))
  async deleteSubdomain(
    @Param('subdomainId', ParseUUIDPipe) subdomainId: string,
  ) {
    await this.domainsService.deleteSubdomain(subdomainId);
  }
}
