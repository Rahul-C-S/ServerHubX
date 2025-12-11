import { apiClient } from './client';
import type {
  AlertRule,
  AlertInstance,
  SystemMetrics,
  ServiceStatus,
  AppMetrics,
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
} from '@/types';

export const monitoringApi = {
  // Metrics
  getCurrentMetrics: async (): Promise<{
    system: SystemMetrics;
    services: ServiceStatus[];
    apps: AppMetrics[];
  }> => {
    const response = await apiClient.get('/monitoring/metrics');
    return response.data;
  },

  getMetricsHistory: async (params?: {
    metric?: string;
    from?: string;
    to?: string;
    interval?: string;
  }): Promise<Array<{ timestamp: string; value: number }>> => {
    const response = await apiClient.get('/monitoring/metrics/history', { params });
    return response.data;
  },

  // Alert Rules
  getRules: async (): Promise<AlertRule[]> => {
    const response = await apiClient.get<AlertRule[]>('/monitoring/rules');
    return response.data;
  },

  getRule: async (id: string): Promise<AlertRule> => {
    const response = await apiClient.get<AlertRule>(`/monitoring/rules/${id}`);
    return response.data;
  },

  createRule: async (data: CreateAlertRuleDto): Promise<AlertRule> => {
    const response = await apiClient.post<AlertRule>('/monitoring/rules', data);
    return response.data;
  },

  updateRule: async (id: string, data: UpdateAlertRuleDto): Promise<AlertRule> => {
    const response = await apiClient.patch<AlertRule>(`/monitoring/rules/${id}`, data);
    return response.data;
  },

  deleteRule: async (id: string): Promise<void> => {
    await apiClient.delete(`/monitoring/rules/${id}`);
  },

  testRule: async (id: string): Promise<{ triggered: boolean; value: number; threshold: number }> => {
    const response = await apiClient.post<{ triggered: boolean; value: number; threshold: number }>(
      `/monitoring/rules/${id}/test`
    );
    return response.data;
  },

  // Alert Instances
  getAlerts: async (params?: { status?: string; ruleId?: string }): Promise<AlertInstance[]> => {
    const response = await apiClient.get<AlertInstance[]>('/monitoring/alerts', { params });
    return response.data;
  },

  getAlert: async (id: string): Promise<AlertInstance> => {
    const response = await apiClient.get<AlertInstance>(`/monitoring/alerts/${id}`);
    return response.data;
  },

  acknowledgeAlert: async (id: string): Promise<AlertInstance> => {
    const response = await apiClient.post<AlertInstance>(`/monitoring/alerts/${id}/acknowledge`);
    return response.data;
  },

  // Services
  getServices: async (): Promise<ServiceStatus[]> => {
    const response = await apiClient.get<ServiceStatus[]>('/monitoring/services');
    return response.data;
  },

  controlService: async (
    name: string,
    action: 'start' | 'stop' | 'restart'
  ): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(
      `/monitoring/services/${name}/${action}`
    );
    return response.data;
  },
};
