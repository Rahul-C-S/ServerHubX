import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertRule, AlertScope } from './entities/alert-rule.entity';
import { AlertInstance, AlertStatus } from './entities/alert-instance.entity';
import { MetricsService, SystemMetrics, ServiceStatus, AppMetrics } from './metrics.service';
import { AlertEngineService } from './alert-engine.service';
import type { CreateAlertRuleDto, UpdateAlertRuleDto, AcknowledgeAlertDto } from './dto/monitoring.dto';
import type { User } from '../users/entities/user.entity';

@Injectable()
export class MonitoringService {
  constructor(
    @InjectRepository(AlertRule)
    private ruleRepository: Repository<AlertRule>,
    @InjectRepository(AlertInstance)
    private instanceRepository: Repository<AlertInstance>,
    private metricsService: MetricsService,
    private alertEngine: AlertEngineService,
  ) {}

  // Metrics
  async getCurrentMetrics(): Promise<SystemMetrics> {
    return this.metricsService.getCurrentMetrics();
  }

  async getHistoricalMetrics(startTime: number, endTime: number): Promise<SystemMetrics[]> {
    return this.metricsService.getHistoricalMetrics('system', startTime, endTime);
  }

  async getServiceStatuses(): Promise<ServiceStatus[]> {
    return this.metricsService.collectServiceMetrics();
  }

  async getAppMetrics(): Promise<AppMetrics[]> {
    return this.metricsService.collectAppMetrics();
  }

  // Alert Rules
  async findAllRules(scope?: AlertScope, domainId?: string, appId?: string): Promise<AlertRule[]> {
    const query = this.ruleRepository
      .createQueryBuilder('rule')
      .leftJoinAndSelect('rule.domain', 'domain')
      .leftJoinAndSelect('rule.app', 'app')
      .orderBy('rule.createdAt', 'DESC');

    if (scope) {
      query.andWhere('rule.scope = :scope', { scope });
    }
    if (domainId) {
      query.andWhere('rule.domainId = :domainId', { domainId });
    }
    if (appId) {
      query.andWhere('rule.appId = :appId', { appId });
    }

    return query.getMany();
  }

  async findRule(id: string): Promise<AlertRule> {
    const rule = await this.ruleRepository.findOne({
      where: { id },
      relations: ['domain', 'app', 'instances'],
    });

    if (!rule) {
      throw new NotFoundException('Alert rule not found');
    }

    return rule;
  }

  async createRule(dto: CreateAlertRuleDto): Promise<AlertRule> {
    const rule = this.ruleRepository.create(dto);
    return this.ruleRepository.save(rule);
  }

  async updateRule(id: string, dto: UpdateAlertRuleDto): Promise<AlertRule> {
    const rule = await this.findRule(id);
    Object.assign(rule, dto);
    return this.ruleRepository.save(rule);
  }

  async deleteRule(id: string): Promise<void> {
    const rule = await this.findRule(id);
    await this.ruleRepository.remove(rule);
  }

  async testRule(id: string): Promise<{ triggered: boolean; value: number; threshold: number }> {
    return this.alertEngine.testRule(id);
  }

  // Alert Instances
  async findAlerts(status?: AlertStatus, ruleId?: string): Promise<AlertInstance[]> {
    const query = this.instanceRepository
      .createQueryBuilder('alert')
      .leftJoinAndSelect('alert.rule', 'rule')
      .leftJoinAndSelect('alert.acknowledgedBy', 'acknowledgedBy')
      .orderBy('alert.createdAt', 'DESC');

    if (status) {
      query.andWhere('alert.status = :status', { status });
    }
    if (ruleId) {
      query.andWhere('alert.ruleId = :ruleId', { ruleId });
    }

    return query.getMany();
  }

  async findAlert(id: string): Promise<AlertInstance> {
    const alert = await this.instanceRepository.findOne({
      where: { id },
      relations: ['rule', 'acknowledgedBy'],
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    return alert;
  }

  async getAlertHistory(
    limit = 100,
    offset = 0,
    severity?: string,
  ): Promise<{ alerts: AlertInstance[]; total: number }> {
    const query = this.instanceRepository
      .createQueryBuilder('alert')
      .leftJoinAndSelect('alert.rule', 'rule')
      .orderBy('alert.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    if (severity) {
      query.andWhere('rule.severity = :severity', { severity });
    }

    const [alerts, total] = await query.getManyAndCount();
    return { alerts, total };
  }

  async acknowledgeAlert(id: string, dto: AcknowledgeAlertDto, user: User): Promise<AlertInstance> {
    const alert = await this.findAlert(id);

    if (alert.status !== AlertStatus.FIRING) {
      throw new Error('Can only acknowledge firing alerts');
    }

    alert.status = AlertStatus.ACKNOWLEDGED;
    alert.acknowledgedAt = new Date();
    alert.acknowledgedById = user.id;
    alert.notes = dto.notes;

    return this.instanceRepository.save(alert);
  }

  async resolveAlert(id: string): Promise<AlertInstance> {
    const alert = await this.findAlert(id);

    if (alert.status === AlertStatus.RESOLVED) {
      throw new Error('Alert is already resolved');
    }

    alert.status = AlertStatus.RESOLVED;
    alert.resolvedAt = new Date();

    return this.instanceRepository.save(alert);
  }

  // Default alert rules seed
  async seedDefaultRules(): Promise<void> {
    const existingRules = await this.ruleRepository.count();
    if (existingRules > 0) {
      return;
    }

    const defaultRules: Partial<AlertRule>[] = [
      {
        name: 'High CPU Usage',
        description: 'CPU usage exceeds 90% for 5 minutes',
        scope: AlertScope.SYSTEM,
        metric: 'cpu_usage' as AlertRule['metric'],
        severity: 'critical' as AlertRule['severity'],
        threshold: 90,
        operator: 'gt' as AlertRule['operator'],
        durationSeconds: 300,
        cooldownSeconds: 600,
      },
      {
        name: 'High Memory Usage',
        description: 'Memory usage exceeds 85% for 5 minutes',
        scope: AlertScope.SYSTEM,
        metric: 'memory_usage' as AlertRule['metric'],
        severity: 'critical' as AlertRule['severity'],
        threshold: 85,
        operator: 'gt' as AlertRule['operator'],
        durationSeconds: 300,
        cooldownSeconds: 600,
      },
      {
        name: 'Disk Almost Full',
        description: 'Disk usage exceeds 90%',
        scope: AlertScope.SYSTEM,
        metric: 'disk_usage' as AlertRule['metric'],
        severity: 'critical' as AlertRule['severity'],
        threshold: 90,
        operator: 'gt' as AlertRule['operator'],
        durationSeconds: 60,
        cooldownSeconds: 3600,
      },
      {
        name: 'Disk Warning',
        description: 'Disk usage exceeds 80%',
        scope: AlertScope.SYSTEM,
        metric: 'disk_usage' as AlertRule['metric'],
        severity: 'warning' as AlertRule['severity'],
        threshold: 80,
        operator: 'gt' as AlertRule['operator'],
        durationSeconds: 60,
        cooldownSeconds: 3600,
      },
    ];

    for (const rule of defaultRules) {
      const entity = this.ruleRepository.create(rule);
      await this.ruleRepository.save(entity);
    }
  }
}
