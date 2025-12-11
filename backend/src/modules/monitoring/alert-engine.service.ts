import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AlertRule, AlertMetric, AlertOperator } from './entities/alert-rule.entity';
import { AlertInstance, AlertStatus } from './entities/alert-instance.entity';
import { MetricsService, SystemMetrics, ServiceStatus, AppMetrics } from './metrics.service';

interface MetricValue {
  value: number;
  context?: Record<string, unknown>;
}

@Injectable()
export class AlertEngineService {
  private readonly logger = new Logger(AlertEngineService.name);
  private readonly breachTimestamps: Map<string, number> = new Map();

  constructor(
    @InjectRepository(AlertRule)
    private ruleRepository: Repository<AlertRule>,
    @InjectRepository(AlertInstance)
    private instanceRepository: Repository<AlertInstance>,
    private metricsService: MetricsService,
    private eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async evaluateRules(): Promise<void> {
    try {
      const rules = await this.ruleRepository.find({
        where: { enabled: true },
        relations: ['domain', 'app'],
      });

      const [systemMetrics, serviceStatuses, appMetrics] = await Promise.all([
        this.metricsService.collectSystemMetrics(),
        this.metricsService.collectServiceMetrics(),
        this.metricsService.collectAppMetrics(),
      ]);

      for (const rule of rules) {
        await this.evaluateRule(rule, systemMetrics, serviceStatuses, appMetrics);
      }
    } catch (error) {
      this.logger.error(`Failed to evaluate alert rules: ${error}`);
    }
  }

  private async evaluateRule(
    rule: AlertRule,
    systemMetrics: SystemMetrics,
    serviceStatuses: ServiceStatus[],
    appMetrics: AppMetrics[],
  ): Promise<void> {
    const metricValue = this.getMetricValue(rule, systemMetrics, serviceStatuses, appMetrics);

    if (metricValue === null) {
      return;
    }

    const breachKey = `alert:breach:${rule.id}`;
    const isBreaching = this.checkThreshold(metricValue.value, rule.threshold, rule.operator);

    if (isBreaching) {
      const existingBreachTime = this.breachTimestamps.get(breachKey);
      const now = Date.now();

      if (!existingBreachTime) {
        this.breachTimestamps.set(breachKey, now);
      } else {
        const breachDuration = (now - existingBreachTime) / 1000;

        if (breachDuration >= rule.durationSeconds) {
          await this.handleAlertFiring(rule, metricValue);
        }
      }
    } else {
      this.breachTimestamps.delete(breachKey);
      await this.handleAlertResolved(rule);
    }
  }

  private getMetricValue(
    rule: AlertRule,
    systemMetrics: SystemMetrics,
    serviceStatuses: ServiceStatus[],
    appMetrics: AppMetrics[],
  ): MetricValue | null {
    switch (rule.metric) {
      case AlertMetric.CPU_USAGE:
        return { value: systemMetrics.cpu.usage };

      case AlertMetric.MEMORY_USAGE:
        return { value: systemMetrics.memory.usagePercent };

      case AlertMetric.DISK_USAGE:
        const rootDisk = systemMetrics.disk.find((d) => d.mountPoint === '/');
        return rootDisk ? { value: rootDisk.usagePercent } : null;

      case AlertMetric.NETWORK_IN:
        const netIn = systemMetrics.network.reduce((sum, n) => sum + n.bytesIn, 0);
        return { value: netIn };

      case AlertMetric.NETWORK_OUT:
        const netOut = systemMetrics.network.reduce((sum, n) => sum + n.bytesOut, 0);
        return { value: netOut };

      case AlertMetric.SERVICE_STATUS:
        if (rule.serviceName) {
          const service = serviceStatuses.find((s) => s.name === rule.serviceName);
          return service ? { value: service.running ? 1 : 0, context: { serviceName: rule.serviceName } } : null;
        }
        return null;

      case AlertMetric.APP_STATUS:
        if (rule.appId) {
          const app = appMetrics.find((a) => a.appId === rule.appId);
          return app ? { value: app.status === 'online' ? 1 : 0, context: { appName: app.name } } : null;
        }
        return null;

      case AlertMetric.APP_MEMORY:
        if (rule.appId) {
          const app = appMetrics.find((a) => a.appId === rule.appId);
          return app ? { value: app.memory, context: { appName: app.name } } : null;
        }
        return null;

      case AlertMetric.APP_CPU:
        if (rule.appId) {
          const app = appMetrics.find((a) => a.appId === rule.appId);
          return app ? { value: app.cpu, context: { appName: app.name } } : null;
        }
        return null;

      case AlertMetric.APP_RESTARTS:
        if (rule.appId) {
          const app = appMetrics.find((a) => a.appId === rule.appId);
          return app ? { value: app.restarts, context: { appName: app.name } } : null;
        }
        return null;

      default:
        return null;
    }
  }

  private checkThreshold(value: number, threshold: number, operator: AlertOperator): boolean {
    switch (operator) {
      case AlertOperator.GREATER_THAN:
        return value > threshold;
      case AlertOperator.LESS_THAN:
        return value < threshold;
      case AlertOperator.EQUALS:
        return value === threshold;
      case AlertOperator.NOT_EQUALS:
        return value !== threshold;
      case AlertOperator.GREATER_THAN_OR_EQUAL:
        return value >= threshold;
      case AlertOperator.LESS_THAN_OR_EQUAL:
        return value <= threshold;
      default:
        return false;
    }
  }

  private async handleAlertFiring(rule: AlertRule, metricValue: MetricValue): Promise<void> {
    // Check cooldown
    if (rule.lastTriggeredAt) {
      const timeSinceLastTrigger = (Date.now() - rule.lastTriggeredAt.getTime()) / 1000;
      if (timeSinceLastTrigger < rule.cooldownSeconds) {
        return;
      }
    }

    // Check for existing firing alert
    const existingAlert = await this.instanceRepository.findOne({
      where: { ruleId: rule.id, status: AlertStatus.FIRING },
    });

    if (existingAlert) {
      return;
    }

    // Create new alert instance
    const alert = this.instanceRepository.create({
      ruleId: rule.id,
      status: AlertStatus.FIRING,
      value: metricValue.value,
      threshold: rule.threshold,
      firedAt: new Date(),
      context: {
        ...metricValue.context,
        hostname: require('os').hostname(),
        domainName: rule.domain?.name,
        appName: rule.app?.name,
      },
    });

    await this.instanceRepository.save(alert);

    // Update rule
    await this.ruleRepository.update(rule.id, {
      lastTriggeredAt: new Date(),
      triggerCount: () => 'trigger_count + 1',
    });

    // Emit event for notification dispatcher
    this.eventEmitter.emit('alert.fired', {
      alert,
      rule,
    });

    this.logger.warn(`Alert fired: ${rule.name} - Value: ${metricValue.value}, Threshold: ${rule.threshold}`);
  }

  private async handleAlertResolved(rule: AlertRule): Promise<void> {
    const firingAlerts = await this.instanceRepository.find({
      where: { ruleId: rule.id, status: AlertStatus.FIRING },
    });

    for (const alert of firingAlerts) {
      alert.status = AlertStatus.RESOLVED;
      alert.resolvedAt = new Date();
      await this.instanceRepository.save(alert);

      this.eventEmitter.emit('alert.resolved', {
        alert,
        rule,
      });

      this.logger.log(`Alert resolved: ${rule.name}`);
    }
  }

  async testRule(ruleId: string): Promise<{ triggered: boolean; value: number; threshold: number }> {
    const rule = await this.ruleRepository.findOne({
      where: { id: ruleId },
      relations: ['domain', 'app'],
    });

    if (!rule) {
      throw new Error('Rule not found');
    }

    const [systemMetrics, serviceStatuses, appMetrics] = await Promise.all([
      this.metricsService.collectSystemMetrics(),
      this.metricsService.collectServiceMetrics(),
      this.metricsService.collectAppMetrics(),
    ]);

    const metricValue = this.getMetricValue(rule, systemMetrics, serviceStatuses, appMetrics);

    if (!metricValue) {
      return { triggered: false, value: 0, threshold: rule.threshold };
    }

    const triggered = this.checkThreshold(metricValue.value, rule.threshold, rule.operator);

    return {
      triggered,
      value: metricValue.value,
      threshold: rule.threshold,
    };
  }
}
