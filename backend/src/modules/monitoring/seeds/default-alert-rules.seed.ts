import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AlertRule,
  AlertSeverity,
  AlertMetric,
  AlertOperator,
  AlertScope,
} from '../entities/alert-rule.entity';

@Injectable()
export class DefaultAlertRulesSeed implements OnModuleInit {
  constructor(
    @InjectRepository(AlertRule)
    private readonly alertRuleRepository: Repository<AlertRule>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultRules();
  }

  async seedDefaultRules() {
    const existingRules = await this.alertRuleRepository.count();
    if (existingRules > 0) {
      return; // Don't seed if rules already exist
    }

    const defaultRules: Partial<AlertRule>[] = [
      // CPU Alerts
      {
        name: 'High CPU Usage',
        description: 'CPU usage has exceeded 90% for 5 minutes',
        metric: AlertMetric.CPU_USAGE,
        operator: AlertOperator.GREATER_THAN,
        threshold: 90,
        severity: AlertSeverity.CRITICAL,
        durationSeconds: 300,
        cooldownSeconds: 600,
        scope: AlertScope.SYSTEM,
        enabled: true,
      },
      {
        name: 'Elevated CPU Usage',
        description: 'CPU usage has exceeded 75% for 10 minutes',
        metric: AlertMetric.CPU_USAGE,
        operator: AlertOperator.GREATER_THAN,
        threshold: 75,
        severity: AlertSeverity.WARNING,
        durationSeconds: 600,
        cooldownSeconds: 900,
        scope: AlertScope.SYSTEM,
        enabled: true,
      },

      // Memory Alerts
      {
        name: 'High Memory Usage',
        description: 'Memory usage has exceeded 85% for 5 minutes',
        metric: AlertMetric.MEMORY_USAGE,
        operator: AlertOperator.GREATER_THAN,
        threshold: 85,
        severity: AlertSeverity.CRITICAL,
        durationSeconds: 300,
        cooldownSeconds: 600,
        scope: AlertScope.SYSTEM,
        enabled: true,
      },
      {
        name: 'Elevated Memory Usage',
        description: 'Memory usage has exceeded 70% for 10 minutes',
        metric: AlertMetric.MEMORY_USAGE,
        operator: AlertOperator.GREATER_THAN,
        threshold: 70,
        severity: AlertSeverity.WARNING,
        durationSeconds: 600,
        cooldownSeconds: 900,
        scope: AlertScope.SYSTEM,
        enabled: true,
      },

      // Disk Alerts
      {
        name: 'Disk Almost Full',
        description: 'Disk usage has exceeded 90%',
        metric: AlertMetric.DISK_USAGE,
        operator: AlertOperator.GREATER_THAN,
        threshold: 90,
        severity: AlertSeverity.CRITICAL,
        durationSeconds: 60,
        cooldownSeconds: 3600,
        scope: AlertScope.SYSTEM,
        enabled: true,
      },
      {
        name: 'Disk Warning',
        description: 'Disk usage has exceeded 80%',
        metric: AlertMetric.DISK_USAGE,
        operator: AlertOperator.GREATER_THAN,
        threshold: 80,
        severity: AlertSeverity.WARNING,
        durationSeconds: 60,
        cooldownSeconds: 3600,
        scope: AlertScope.SYSTEM,
        enabled: true,
      },

      // Service Alerts
      {
        name: 'Service Down',
        description: 'A critical service has stopped running',
        metric: AlertMetric.SERVICE_STATUS,
        operator: AlertOperator.EQUALS,
        threshold: 0,
        severity: AlertSeverity.CRITICAL,
        durationSeconds: 30,
        cooldownSeconds: 300,
        scope: AlertScope.SERVICE,
        enabled: true,
      },

      // App Alerts
      {
        name: 'App Crashed',
        description: 'An application has crashed or stopped unexpectedly',
        metric: AlertMetric.APP_STATUS,
        operator: AlertOperator.EQUALS,
        threshold: 0,
        severity: AlertSeverity.CRITICAL,
        durationSeconds: 30,
        cooldownSeconds: 300,
        scope: AlertScope.APP,
        enabled: true,
      },
      {
        name: 'App High Memory',
        description: 'Application memory usage exceeds 500MB',
        metric: AlertMetric.APP_MEMORY,
        operator: AlertOperator.GREATER_THAN,
        threshold: 500,
        severity: AlertSeverity.WARNING,
        durationSeconds: 300,
        cooldownSeconds: 600,
        scope: AlertScope.APP,
        enabled: true,
      },
      {
        name: 'App High CPU',
        description: 'Application CPU usage exceeds 80%',
        metric: AlertMetric.APP_CPU,
        operator: AlertOperator.GREATER_THAN,
        threshold: 80,
        severity: AlertSeverity.WARNING,
        durationSeconds: 300,
        cooldownSeconds: 600,
        scope: AlertScope.APP,
        enabled: true,
      },
      {
        name: 'App High Restarts',
        description: 'Application has restarted more than 5 times in an hour',
        metric: AlertMetric.APP_RESTARTS,
        operator: AlertOperator.GREATER_THAN,
        threshold: 5,
        severity: AlertSeverity.WARNING,
        durationSeconds: 0,
        cooldownSeconds: 3600,
        scope: AlertScope.APP,
        enabled: true,
      },

      // SSL Alerts
      {
        name: 'SSL Expiring Soon',
        description: 'SSL certificate will expire within 14 days',
        metric: AlertMetric.SSL_EXPIRY,
        operator: AlertOperator.LESS_THAN,
        threshold: 14,
        severity: AlertSeverity.WARNING,
        durationSeconds: 0,
        cooldownSeconds: 86400,
        scope: AlertScope.DOMAIN,
        enabled: true,
      },
      {
        name: 'SSL Expiring Critical',
        description: 'SSL certificate will expire within 3 days',
        metric: AlertMetric.SSL_EXPIRY,
        operator: AlertOperator.LESS_THAN,
        threshold: 3,
        severity: AlertSeverity.CRITICAL,
        durationSeconds: 0,
        cooldownSeconds: 43200,
        scope: AlertScope.DOMAIN,
        enabled: true,
      },

      // Database Alerts
      {
        name: 'Database Slow Queries',
        description: 'Database has slow queries exceeding threshold',
        metric: AlertMetric.DB_SLOW_QUERIES,
        operator: AlertOperator.GREATER_THAN,
        threshold: 10,
        severity: AlertSeverity.WARNING,
        durationSeconds: 300,
        cooldownSeconds: 900,
        scope: AlertScope.SYSTEM,
        enabled: true,
      },
      {
        name: 'Database Connections High',
        description: 'Database connections exceed 80% of max',
        metric: AlertMetric.DB_CONNECTIONS,
        operator: AlertOperator.GREATER_THAN,
        threshold: 80,
        severity: AlertSeverity.WARNING,
        durationSeconds: 300,
        cooldownSeconds: 600,
        scope: AlertScope.SYSTEM,
        enabled: true,
      },

      // Mail Alerts
      {
        name: 'Mail Queue Backup',
        description: 'Mail queue has more than 100 pending messages',
        metric: AlertMetric.MAIL_QUEUE,
        operator: AlertOperator.GREATER_THAN,
        threshold: 100,
        severity: AlertSeverity.WARNING,
        durationSeconds: 600,
        cooldownSeconds: 1800,
        scope: AlertScope.SYSTEM,
        enabled: true,
      },
      {
        name: 'Mail Queue Critical',
        description: 'Mail queue has more than 500 pending messages',
        metric: AlertMetric.MAIL_QUEUE,
        operator: AlertOperator.GREATER_THAN,
        threshold: 500,
        severity: AlertSeverity.CRITICAL,
        durationSeconds: 300,
        cooldownSeconds: 1800,
        scope: AlertScope.SYSTEM,
        enabled: true,
      },

      // Network Alerts
      {
        name: 'High Network Inbound',
        description: 'Network inbound traffic exceeds 100 MB/s',
        metric: AlertMetric.NETWORK_IN,
        operator: AlertOperator.GREATER_THAN,
        threshold: 100,
        severity: AlertSeverity.WARNING,
        durationSeconds: 300,
        cooldownSeconds: 600,
        scope: AlertScope.SYSTEM,
        enabled: true,
      },
      {
        name: 'High Network Outbound',
        description: 'Network outbound traffic exceeds 100 MB/s',
        metric: AlertMetric.NETWORK_OUT,
        operator: AlertOperator.GREATER_THAN,
        threshold: 100,
        severity: AlertSeverity.WARNING,
        durationSeconds: 300,
        cooldownSeconds: 600,
        scope: AlertScope.SYSTEM,
        enabled: true,
      },

      // Response Time Alerts
      {
        name: 'High Response Time',
        description: 'Average response time exceeds 2 seconds',
        metric: AlertMetric.RESPONSE_TIME,
        operator: AlertOperator.GREATER_THAN,
        threshold: 2000,
        severity: AlertSeverity.WARNING,
        durationSeconds: 300,
        cooldownSeconds: 600,
        scope: AlertScope.APP,
        enabled: true,
      },

      // Error Rate Alerts
      {
        name: 'High Error Rate',
        description: 'Error rate exceeds 5%',
        metric: AlertMetric.ERROR_RATE,
        operator: AlertOperator.GREATER_THAN,
        threshold: 5,
        severity: AlertSeverity.WARNING,
        durationSeconds: 300,
        cooldownSeconds: 600,
        scope: AlertScope.APP,
        enabled: true,
      },
      {
        name: 'Critical Error Rate',
        description: 'Error rate exceeds 10%',
        metric: AlertMetric.ERROR_RATE,
        operator: AlertOperator.GREATER_THAN,
        threshold: 10,
        severity: AlertSeverity.CRITICAL,
        durationSeconds: 120,
        cooldownSeconds: 300,
        scope: AlertScope.APP,
        enabled: true,
      },
    ];

    for (const rule of defaultRules) {
      const alertRule = this.alertRuleRepository.create(rule);
      await this.alertRuleRepository.save(alertRule);
    }

    console.log(`Seeded ${defaultRules.length} default alert rules`);
  }
}
