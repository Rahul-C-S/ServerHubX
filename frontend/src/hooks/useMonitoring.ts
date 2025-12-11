import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { monitoringApi } from '@/lib/api';
import type { AlertRule, AlertInstance, CreateAlertRuleDto, UpdateAlertRuleDto } from '@/types';

// Query Keys
export const monitoringKeys = {
  all: ['monitoring'] as const,
  metrics: () => [...monitoringKeys.all, 'metrics'] as const,
  metricsHistory: (params?: { metric?: string; from?: string; to?: string }) =>
    [...monitoringKeys.metrics(), 'history', params] as const,
  rules: () => [...monitoringKeys.all, 'rules'] as const,
  rule: (id: string) => [...monitoringKeys.rules(), id] as const,
  alerts: () => [...monitoringKeys.all, 'alerts'] as const,
  alertList: (params?: { status?: string; ruleId?: string }) =>
    [...monitoringKeys.alerts(), params] as const,
  alert: (id: string) => [...monitoringKeys.alerts(), id] as const,
  services: () => [...monitoringKeys.all, 'services'] as const,
};

// Metrics Queries
export function useCurrentMetrics() {
  return useQuery({
    queryKey: monitoringKeys.metrics(),
    queryFn: () => monitoringApi.getCurrentMetrics(),
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}

export function useMetricsHistory(params?: { metric?: string; from?: string; to?: string }) {
  return useQuery({
    queryKey: monitoringKeys.metricsHistory(params),
    queryFn: () => monitoringApi.getMetricsHistory(params),
    enabled: !!params?.metric,
  });
}

// Alert Rules Queries
export function useAlertRules() {
  return useQuery({
    queryKey: monitoringKeys.rules(),
    queryFn: () => monitoringApi.getRules(),
  });
}

export function useAlertRule(id: string) {
  return useQuery({
    queryKey: monitoringKeys.rule(id),
    queryFn: () => monitoringApi.getRule(id),
    enabled: !!id,
  });
}

// Alert Rules Mutations
export function useCreateAlertRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAlertRuleDto) => monitoringApi.createRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: monitoringKeys.rules() });
    },
  });
}

export function useUpdateAlertRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAlertRuleDto }) =>
      monitoringApi.updateRule(id, data),
    onSuccess: (_data: AlertRule, variables) => {
      queryClient.invalidateQueries({ queryKey: monitoringKeys.rule(variables.id) });
      queryClient.invalidateQueries({ queryKey: monitoringKeys.rules() });
    },
  });
}

export function useDeleteAlertRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => monitoringApi.deleteRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: monitoringKeys.rules() });
    },
  });
}

export function useTestAlertRule() {
  return useMutation({
    mutationFn: (id: string) => monitoringApi.testRule(id),
  });
}

// Alert Instances Queries
export function useAlerts(params?: { status?: string; ruleId?: string }) {
  return useQuery({
    queryKey: monitoringKeys.alertList(params),
    queryFn: () => monitoringApi.getAlerts(params),
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}

export function useAlert(id: string) {
  return useQuery({
    queryKey: monitoringKeys.alert(id),
    queryFn: () => monitoringApi.getAlert(id),
    enabled: !!id,
  });
}

// Alert Instance Mutations
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => monitoringApi.acknowledgeAlert(id),
    onSuccess: (_data: AlertInstance) => {
      queryClient.invalidateQueries({ queryKey: monitoringKeys.alerts() });
    },
  });
}

// Services Queries
export function useServices() {
  return useQuery({
    queryKey: monitoringKeys.services(),
    queryFn: () => monitoringApi.getServices(),
    refetchInterval: 10000,
  });
}

// Service Mutations
export function useControlService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, action }: { name: string; action: 'start' | 'stop' | 'restart' }) =>
      monitoringApi.controlService(name, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: monitoringKeys.services() });
    },
  });
}
