import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { systemApi } from '@/lib/api/system';
import type { UpdateSettingDto } from '@/types/system';

export function useSystemInfo() {
  return useQuery({
    queryKey: ['system', 'info'],
    queryFn: systemApi.getInfo,
    refetchInterval: 10000,
  });
}

export function useInstalledVersions() {
  return useQuery({
    queryKey: ['system', 'versions'],
    queryFn: systemApi.getVersions,
  });
}

export function useServices() {
  return useQuery({
    queryKey: ['system', 'services'],
    queryFn: systemApi.getServices,
    refetchInterval: 15000,
  });
}

export function useStartService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => systemApi.startService(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'services'] });
    },
  });
}

export function useStopService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => systemApi.stopService(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'services'] });
    },
  });
}

export function useRestartService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => systemApi.restartService(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'services'] });
    },
  });
}

export function useEnableService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => systemApi.enableService(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'services'] });
    },
  });
}

export function useDisableService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => systemApi.disableService(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'services'] });
    },
  });
}

export function usePackageUpdates() {
  return useQuery({
    queryKey: ['system', 'updates'],
    queryFn: systemApi.getUpdates,
    refetchInterval: 300000, // 5 minutes
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ['system', 'settings'],
    queryFn: systemApi.getSettings,
  });
}

export function useSettingsByPrefix(prefix: string) {
  return useQuery({
    queryKey: ['system', 'settings', prefix],
    queryFn: () => systemApi.getSettingsByPrefix(prefix),
    enabled: !!prefix,
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateSettingDto) => systemApi.updateSetting(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'settings'] });
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: Array<{ key: string; value: string | number | boolean | object }>) =>
      systemApi.updateSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'settings'] });
    },
  });
}
