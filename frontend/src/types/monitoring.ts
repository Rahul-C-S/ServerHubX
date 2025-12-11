export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'FIRING' | 'RESOLVED' | 'ACKNOWLEDGED';
export type AlertMetric =
  | 'CPU_USAGE'
  | 'MEMORY_USAGE'
  | 'DISK_USAGE'
  | 'NETWORK_IN'
  | 'NETWORK_OUT'
  | 'SERVICE_STATUS'
  | 'APP_STATUS'
  | 'APP_MEMORY'
  | 'APP_CPU'
  | 'APP_RESTARTS';

export type AlertOperator =
  | 'GREATER_THAN'
  | 'LESS_THAN'
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER_THAN_OR_EQUAL'
  | 'LESS_THAN_OR_EQUAL';

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  metric: AlertMetric;
  operator: AlertOperator;
  threshold: number;
  durationSeconds: number;
  cooldownSeconds: number;
  severity: AlertSeverity;
  enabled: boolean;
  domainId?: string;
  appId?: string;
  serviceName?: string;
  notificationOverrides?: {
    email?: boolean;
    sms?: boolean;
    fcm?: boolean;
    whatsapp?: boolean;
    webhook?: boolean;
    webhookUrl?: string;
  };
  lastTriggeredAt?: string;
  triggerCount: number;
  createdAt: string;
  updatedAt: string;
  domain?: {
    id: string;
    name: string;
  };
  app?: {
    id: string;
    name: string;
  };
}

export interface AlertInstance {
  id: string;
  ruleId: string;
  status: AlertStatus;
  value: number;
  threshold: number;
  firedAt: string;
  resolvedAt?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  context?: Record<string, unknown>;
  createdAt: string;
  rule?: AlertRule;
}

export interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  disk: Array<{
    mountPoint: string;
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  }>;
  network: Array<{
    interface: string;
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  }>;
  uptime: number;
  timestamp: string;
}

export interface ServiceStatus {
  name: string;
  running: boolean;
  enabled: boolean;
  pid?: number;
  memory?: number;
  cpu?: number;
}

export interface AppMetrics {
  appId: string;
  name: string;
  status: string;
  cpu: number;
  memory: number;
  restarts: number;
  uptime: number;
}

export interface CreateAlertRuleDto {
  name: string;
  description?: string;
  metric: AlertMetric;
  operator: AlertOperator;
  threshold: number;
  durationSeconds?: number;
  cooldownSeconds?: number;
  severity?: AlertSeverity;
  domainId?: string;
  appId?: string;
  serviceName?: string;
  notificationOverrides?: AlertRule['notificationOverrides'];
  enabled?: boolean;
}

export interface UpdateAlertRuleDto {
  name?: string;
  description?: string;
  threshold?: number;
  durationSeconds?: number;
  cooldownSeconds?: number;
  severity?: AlertSeverity;
  notificationOverrides?: AlertRule['notificationOverrides'];
  enabled?: boolean;
}
