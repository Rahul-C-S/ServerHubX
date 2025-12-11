import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appsApi } from '@/lib/api';
import type { CreateAppDto, UpdateAppDto, EnvVariable } from '@/types';

const APPS_KEY = 'apps';

export function useApps(domainId?: string) {
  return useQuery({
    queryKey: [APPS_KEY, domainId],
    queryFn: () => appsApi.getAll(domainId),
  });
}

export function useApp(id: string) {
  return useQuery({
    queryKey: [APPS_KEY, id],
    queryFn: () => appsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateAppDto) => appsApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [APPS_KEY] });
    },
  });
}

export function useUpdateApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateAppDto }) =>
      appsApi.update(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [APPS_KEY] });
      queryClient.invalidateQueries({ queryKey: [APPS_KEY, id] });
    },
  });
}

export function useDeleteApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => appsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [APPS_KEY] });
    },
  });
}

export function useStartApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => appsApi.start(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [APPS_KEY, id] });
    },
  });
}

export function useStopApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => appsApi.stop(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [APPS_KEY, id] });
    },
  });
}

export function useRestartApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => appsApi.restart(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [APPS_KEY, id] });
    },
  });
}

export function useReloadApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => appsApi.reload(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [APPS_KEY, id] });
    },
  });
}

export function useDeployApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => appsApi.deploy(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [APPS_KEY, id] });
    },
  });
}

export function useAppDeployments(appId: string, limit?: number) {
  return useQuery({
    queryKey: [APPS_KEY, appId, 'deployments'],
    queryFn: () => appsApi.getDeployments(appId, limit),
    enabled: !!appId,
    refetchInterval: 5000, // Poll every 5 seconds
  });
}

export function useDeploymentStatus(appId: string, jobId: string) {
  return useQuery({
    queryKey: [APPS_KEY, appId, 'deployments', jobId],
    queryFn: () => appsApi.getDeploymentStatus(appId, jobId),
    enabled: !!appId && !!jobId,
    refetchInterval: 2000, // Poll every 2 seconds during deployment
  });
}

export function useAppLogs(appId: string, lines?: number) {
  return useQuery({
    queryKey: [APPS_KEY, appId, 'logs', lines],
    queryFn: () => appsApi.getLogs(appId, lines),
    enabled: !!appId,
  });
}

export function useFlushAppLogs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => appsApi.flushLogs(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [APPS_KEY, id, 'logs'] });
    },
  });
}

export function useAppEnv(appId: string) {
  return useQuery({
    queryKey: [APPS_KEY, appId, 'env'],
    queryFn: () => appsApi.getEnv(appId),
    enabled: !!appId,
  });
}

export function useSetAppEnv() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appId, variables }: { appId: string; variables: EnvVariable[] }) =>
      appsApi.setEnv(appId, variables),
    onSuccess: (_, { appId }) => {
      queryClient.invalidateQueries({ queryKey: [APPS_KEY, appId, 'env'] });
    },
  });
}

export function useDeleteAppEnv() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appId, keys }: { appId: string; keys: string[] }) =>
      appsApi.deleteEnv(appId, keys),
    onSuccess: (_, { appId }) => {
      queryClient.invalidateQueries({ queryKey: [APPS_KEY, appId, 'env'] });
    },
  });
}
