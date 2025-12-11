import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MonitoringService } from './monitoring.service';
import {
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
  AcknowledgeAlertDto,
} from './dto/monitoring.dto';
import { AlertScope } from './entities/alert-rule.entity';
import { AlertStatus } from './entities/alert-instance.entity';
import type { User } from '../users/entities/user.entity';

@Controller('monitoring')
@UseGuards(JwtAuthGuard)
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  // Metrics endpoints
  @Get('metrics/system')
  async getCurrentMetrics() {
    return this.monitoringService.getCurrentMetrics();
  }

  @Get('metrics/system/history')
  async getHistoricalMetrics(
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    const start = startTime ? parseInt(startTime, 10) : Date.now() - 3600000;
    const end = endTime ? parseInt(endTime, 10) : Date.now();
    return this.monitoringService.getHistoricalMetrics(start, end);
  }

  @Get('metrics/services')
  async getServiceStatuses() {
    return this.monitoringService.getServiceStatuses();
  }

  @Get('metrics/apps')
  async getAppMetrics() {
    return this.monitoringService.getAppMetrics();
  }

  // Alert rules endpoints
  @Get('alerts/rules')
  async findAllRules(
    @Query('scope') scope?: AlertScope,
    @Query('domainId') domainId?: string,
    @Query('appId') appId?: string,
  ) {
    return this.monitoringService.findAllRules(scope, domainId, appId);
  }

  @Post('alerts/rules')
  async createRule(@Body() dto: CreateAlertRuleDto) {
    return this.monitoringService.createRule(dto);
  }

  @Get('alerts/rules/:id')
  async findRule(@Param('id') id: string) {
    return this.monitoringService.findRule(id);
  }

  @Patch('alerts/rules/:id')
  async updateRule(@Param('id') id: string, @Body() dto: UpdateAlertRuleDto) {
    return this.monitoringService.updateRule(id, dto);
  }

  @Delete('alerts/rules/:id')
  async deleteRule(@Param('id') id: string) {
    await this.monitoringService.deleteRule(id);
    return { success: true };
  }

  @Post('alerts/rules/:id/test')
  async testRule(@Param('id') id: string) {
    return this.monitoringService.testRule(id);
  }

  // Alert instances endpoints
  @Get('alerts')
  async findAlerts(
    @Query('status') status?: AlertStatus,
    @Query('ruleId') ruleId?: string,
  ) {
    return this.monitoringService.findAlerts(status, ruleId);
  }

  @Get('alerts/history')
  async getAlertHistory(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('severity') severity?: string,
  ) {
    return this.monitoringService.getAlertHistory(
      limit ? parseInt(limit, 10) : 100,
      offset ? parseInt(offset, 10) : 0,
      severity,
    );
  }

  @Get('alerts/:id')
  async findAlert(@Param('id') id: string) {
    return this.monitoringService.findAlert(id);
  }

  @Post('alerts/:id/acknowledge')
  async acknowledgeAlert(
    @Param('id') id: string,
    @Body() dto: AcknowledgeAlertDto,
    @CurrentUser() user: User,
  ) {
    return this.monitoringService.acknowledgeAlert(id, dto, user);
  }

  @Post('alerts/:id/resolve')
  async resolveAlert(@Param('id') id: string) {
    return this.monitoringService.resolveAlert(id);
  }
}
