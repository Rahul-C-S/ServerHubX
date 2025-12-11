import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sshApi } from '@/lib/api/ssh';
import type { ChangeSSHPortDto, UpdateSSHSecurityDto } from '@/types/system';

export function useSSHConfig() {
  return useQuery({
    queryKey: ['ssh', 'config'],
    queryFn: sshApi.getConfig,
  });
}

export function useSSHPort() {
  return useQuery({
    queryKey: ['ssh', 'port'],
    queryFn: sshApi.getPort,
  });
}

export function useChangeSSHPort() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: ChangeSSHPortDto) => sshApi.changePort(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ssh'] });
    },
  });
}

export function useSSHSecuritySettings() {
  return useQuery({
    queryKey: ['ssh', 'security'],
    queryFn: sshApi.getSecuritySettings,
  });
}

export function useUpdateSSHSecurity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateSSHSecurityDto) => sshApi.updateSecuritySettings(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ssh'] });
    },
  });
}

export function useSSHConnectionInfo() {
  return useQuery({
    queryKey: ['ssh', 'connection-info'],
    queryFn: sshApi.getConnectionInfo,
  });
}

export function useValidateSSHConfig() {
  return useQuery({
    queryKey: ['ssh', 'validate'],
    queryFn: sshApi.validateConfig,
  });
}
