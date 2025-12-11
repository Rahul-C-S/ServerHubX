import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { AppsService } from './apps.service.js';
import { DeploymentService } from './services/deployment.service.js';
import { CreateAppDto } from './dto/create-app.dto.js';
import { UpdateAppDto } from './dto/update-app.dto.js';
import { SetEnvDto, DeleteEnvDto } from './dto/set-env.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PoliciesGuard } from '../authorization/guards/policies.guard.js';
import { CheckPolicies } from '../authorization/decorators/check-policies.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';

@Controller('apps')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class AppsController {
  constructor(
    private readonly appsService: AppsService,
    private readonly deploymentService: DeploymentService,
  ) {}

  @Get()
  @CheckPolicies((ability) => ability.can('read', 'App'))
  async findAll(@Query('domainId') domainId?: string) {
    return this.appsService.findAll(domainId);
  }

  @Get(':id')
  @CheckPolicies((ability) => ability.can('read', 'App'))
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.appsService.findOneWithStatus(id);
  }

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'App'))
  async create(@Body() dto: CreateAppDto, @CurrentUser() _user: User) {
    return this.appsService.create(dto);
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can('update', 'App'))
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppDto,
  ) {
    return this.appsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPolicies((ability) => ability.can('delete', 'App'))
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.appsService.delete(id);
  }

  // Process control endpoints
  @Post(':id/start')
  @CheckPolicies((ability) => ability.can('update', 'App'))
  async startApp(@Param('id', ParseUUIDPipe) id: string) {
    return this.appsService.startApp(id);
  }

  @Post(':id/stop')
  @CheckPolicies((ability) => ability.can('update', 'App'))
  async stopApp(@Param('id', ParseUUIDPipe) id: string) {
    return this.appsService.stopApp(id);
  }

  @Post(':id/restart')
  @CheckPolicies((ability) => ability.can('update', 'App'))
  async restartApp(@Param('id', ParseUUIDPipe) id: string) {
    return this.appsService.restartApp(id);
  }

  @Post(':id/reload')
  @CheckPolicies((ability) => ability.can('update', 'App'))
  async reloadApp(@Param('id', ParseUUIDPipe) id: string) {
    return this.appsService.reloadApp(id);
  }

  @Post(':id/deploy')
  @CheckPolicies((ability) => ability.can('update', 'App'))
  async deploy(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const jobId = await this.deploymentService.queueDeployment(id, user.id);
    return { jobId, message: 'Deployment queued' };
  }

  @Get(':id/deployments')
  @CheckPolicies((ability) => ability.can('read', 'App'))
  async getDeployments(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.deploymentService.getAppDeployments(id, limit || 10);
  }

  @Get(':id/deployments/:jobId')
  @CheckPolicies((ability) => ability.can('read', 'App'))
  async getDeploymentStatus(
    @Param('id', ParseUUIDPipe) _id: string,
    @Param('jobId') jobId: string,
  ) {
    const status = await this.deploymentService.getDeploymentStatus(jobId);
    if (!status) {
      throw new NotFoundException('Deployment job not found');
    }
    return status;
  }

  @Post(':id/deployments/:jobId/cancel')
  @CheckPolicies((ability) => ability.can('update', 'App'))
  async cancelDeployment(
    @Param('id', ParseUUIDPipe) _id: string,
    @Param('jobId') jobId: string,
  ) {
    const cancelled = await this.deploymentService.cancelDeployment(jobId);
    return { cancelled };
  }

  @Post(':id/deployments/:jobId/retry')
  @CheckPolicies((ability) => ability.can('update', 'App'))
  async retryDeployment(
    @Param('id', ParseUUIDPipe) _id: string,
    @Param('jobId') jobId: string,
  ) {
    const newJobId = await this.deploymentService.retryFailedDeployment(jobId);
    if (!newJobId) {
      throw new NotFoundException('Deployment job not found or not failed');
    }
    return { jobId: newJobId };
  }

  // Logs endpoints
  @Get(':id/logs')
  @CheckPolicies((ability) => ability.can('read', 'App'))
  async getLogs(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('lines', new ParseIntPipe({ optional: true })) lines?: number,
  ) {
    return this.appsService.getAppLogs(id, lines || 100);
  }

  @Delete(':id/logs')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPolicies((ability) => ability.can('update', 'App'))
  async flushLogs(@Param('id', ParseUUIDPipe) id: string) {
    await this.appsService.flushLogs(id);
  }

  // Environment variables endpoints
  @Get(':id/env')
  @CheckPolicies((ability) => ability.can('read', 'App'))
  async getEnv(@Param('id', ParseUUIDPipe) id: string) {
    const envVars = await this.appsService.getEnvVariables(id);
    // Return masked values for secrets
    return envVars.map((env) => ({
      id: env.id,
      key: env.key,
      value: env.getMaskedValue(),
      isSecret: env.isSecret,
      createdAt: env.createdAt,
      updatedAt: env.updatedAt,
    }));
  }

  @Put(':id/env')
  @CheckPolicies((ability) => ability.can('update', 'App'))
  async setEnv(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetEnvDto,
  ) {
    return this.appsService.setEnvVariables(id, dto.variables);
  }

  @Delete(':id/env')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPolicies((ability) => ability.can('update', 'App'))
  async deleteEnv(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeleteEnvDto,
  ) {
    await this.appsService.deleteEnvVariables(id, dto.keys);
  }
}

// Domain-scoped apps controller
@Controller('domains/:domainId/apps')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class DomainAppsController {
  constructor(private readonly appsService: AppsService) {}

  @Get()
  @CheckPolicies((ability) => ability.can('read', 'App'))
  async findAll(@Param('domainId', ParseUUIDPipe) domainId: string) {
    return this.appsService.findAll(domainId);
  }

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'App'))
  async create(
    @Param('domainId', ParseUUIDPipe) domainId: string,
    @Body() dto: CreateAppDto,
  ) {
    return this.appsService.create({ ...dto, domainId });
  }
}
