export interface NotificationPayload {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  alertId?: string;
  ruleName?: string;
  value?: number;
  threshold?: number;
  context?: Record<string, unknown>;
  timestamp: Date;
}

export interface NotificationResult {
  success: boolean;
  provider: string;
  error?: string;
  messageId?: string;
}

export interface NotificationProvider {
  send(payload: NotificationPayload, config: Record<string, unknown>): Promise<NotificationResult>;
  validate(config: Record<string, unknown>): boolean;
}
