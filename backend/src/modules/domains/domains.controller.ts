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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { DomainsService } from './domains.service.js';
import { CreateDomainDto } from './dto/create-domain.dto.js';
import { UpdateDomainDto } from './dto/update-domain.dto.js';
import { CreateSubdomainDto } from './dto/create-subdomain.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PoliciesGuard } from '../authorization/guards/policies.guard.js';
import { CheckPolicies } from '../authorization/decorators/check-policies.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { User, UserRole } from '../users/entities/user.entity.js';

@ApiTags('Domains')
@ApiBearerAuth('JWT-auth')
@Controller('domains')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'Domain'))
  @ApiOperation({ summary: 'Create domain', description: 'Create a new domain with virtual host configuration' })
  @ApiResponse({ status: 201, description: 'Domain created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid domain data' })
  @ApiResponse({ status: 409, description: 'Domain already exists' })
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
  @ApiOperation({ summary: 'List domains', description: 'Get all domains. Admin sees all, others see own domains' })
  @ApiQuery({ name: 'ownerId', required: false, description: 'Filter by owner ID (admin only)' })
  @ApiResponse({ status: 200, description: 'List of domains' })
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
  @ApiOperation({ summary: 'Get domain', description: 'Get domain details by ID' })
  @ApiParam({ name: 'id', description: 'Domain UUID' })
  @ApiResponse({ status: 200, description: 'Domain details' })
  @ApiResponse({ status: 404, description: 'Domain not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.domainsService.findOne(id);
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can('update', 'Domain'))
  @ApiOperation({ summary: 'Update domain', description: 'Update domain settings' })
  @ApiParam({ name: 'id', description: 'Domain UUID' })
  @ApiResponse({ status: 200, description: 'Domain updated successfully' })
  @ApiResponse({ status: 404, description: 'Domain not found' })
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
  @ApiOperation({ summary: 'Delete domain', description: 'Delete a domain and all associated resources' })
  @ApiParam({ name: 'id', description: 'Domain UUID' })
  @ApiResponse({ status: 204, description: 'Domain deleted successfully' })
  @ApiResponse({ status: 404, description: 'Domain not found' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.domainsService.delete(id, user.id);
  }

  @Post(':id/suspend')
  @CheckPolicies((ability) => ability.can('update', 'Domain'))
  @ApiOperation({ summary: 'Suspend domain', description: 'Suspend a domain (disable web access)' })
  @ApiParam({ name: 'id', description: 'Domain UUID' })
  @ApiResponse({ status: 200, description: 'Domain suspended' })
  async suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.domainsService.suspend(id, user.id);
  }

  @Post(':id/unsuspend')
  @CheckPolicies((ability) => ability.can('update', 'Domain'))
  @ApiOperation({ summary: 'Unsuspend domain', description: 'Reactivate a suspended domain' })
  @ApiParam({ name: 'id', description: 'Domain UUID' })
  @ApiResponse({ status: 200, description: 'Domain unsuspended' })
  async unsuspend(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.domainsService.unsuspend(id, user.id);
  }

  @Get(':id/stats')
  @CheckPolicies((ability) => ability.can('read', 'Domain'))
  @ApiOperation({ summary: 'Get domain stats', description: 'Get disk usage and resource statistics' })
  @ApiParam({ name: 'id', description: 'Domain UUID' })
  @ApiResponse({ status: 200, description: 'Domain statistics' })
  async getStats(@Param('id', ParseUUIDPipe) id: string) {
    return this.domainsService.getStats(id);
  }

  // Subdomain endpoints
  @Get(':id/subdomains')
  @CheckPolicies((ability) => ability.can('read', 'Domain'))
  @ApiOperation({ summary: 'List subdomains', description: 'Get all subdomains for a domain' })
  @ApiParam({ name: 'id', description: 'Parent domain UUID' })
  @ApiResponse({ status: 200, description: 'List of subdomains' })
  async listSubdomains(@Param('id', ParseUUIDPipe) id: string) {
    return this.domainsService.listSubdomains(id);
  }

  @Post(':id/subdomains')
  @CheckPolicies((ability) => ability.can('update', 'Domain'))
  @ApiOperation({ summary: 'Create subdomain', description: 'Create a new subdomain' })
  @ApiParam({ name: 'id', description: 'Parent domain UUID' })
  @ApiResponse({ status: 201, description: 'Subdomain created successfully' })
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
  @ApiOperation({ summary: 'Delete subdomain', description: 'Delete a subdomain' })
  @ApiParam({ name: 'id', description: 'Parent domain UUID' })
  @ApiParam({ name: 'subdomainId', description: 'Subdomain UUID' })
  @ApiResponse({ status: 204, description: 'Subdomain deleted' })
  async deleteSubdomain(
    @Param('subdomainId', ParseUUIDPipe) subdomainId: string,
  ) {
    await this.domainsService.deleteSubdomain(subdomainId);
  }
}
