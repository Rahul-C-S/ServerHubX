import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firewallApi } from '@/lib/api/firewall';
import type {
  AllowPortDto,
  BlockIpDto,
  TempBlockIpDto,
  UpdateLFDSettingsDto,
  ConfigureCSFDto,
  FirewallProtocol,
  FirewallDirection,
} from '@/types/system';

export function useFirewallStatus() {
  return useQuery({
    queryKey: ['firewall', 'status'],
    queryFn: firewallApi.getStatus,
    refetchInterval: 30000,
  });
}

export function useAllowedPorts() {
  return useQuery({
    queryKey: ['firewall', 'ports'],
    queryFn: firewallApi.getPorts,
  });
}

export function useAllowPort() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: AllowPortDto) => firewallApi.allowPort(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firewall', 'ports'] });
      queryClient.invalidateQueries({ queryKey: ['firewall', 'rules'] });
    },
  });
}

export function useDenyPort() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ port, protocol, direction }: { port: number; protocol?: FirewallProtocol; direction?: FirewallDirection }) =>
      firewallApi.denyPort(port, protocol, direction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firewall', 'ports'] });
      queryClient.invalidateQueries({ queryKey: ['firewall', 'rules'] });
    },
  });
}

export function useIPLists() {
  return useQuery({
    queryKey: ['firewall', 'ips'],
    queryFn: firewallApi.getIps,
  });
}

export function useAllowIp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ip, comment }: { ip: string; comment?: string }) => firewallApi.allowIp(ip, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firewall', 'ips'] });
      queryClient.invalidateQueries({ queryKey: ['firewall', 'rules'] });
    },
  });
}

export function useBlockIp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: BlockIpDto) => firewallApi.blockIp(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firewall', 'ips'] });
      queryClient.invalidateQueries({ queryKey: ['firewall', 'rules'] });
    },
  });
}

export function useTempBlockIp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: TempBlockIpDto) => firewallApi.tempBlockIp(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firewall', 'ips'] });
      queryClient.invalidateQueries({ queryKey: ['firewall', 'rules'] });
    },
  });
}

export function useUnblockIp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ip: string) => firewallApi.unblockIp(ip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firewall', 'ips'] });
      queryClient.invalidateQueries({ queryKey: ['firewall', 'rules'] });
    },
  });
}

export function useFirewallRules() {
  return useQuery({
    queryKey: ['firewall', 'rules'],
    queryFn: firewallApi.getRules,
  });
}

export function useRestartFirewall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: firewallApi.restart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firewall'] });
    },
  });
}

export function useReloadFirewall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: firewallApi.reload,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firewall'] });
    },
  });
}

export function useInstallFirewall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: firewallApi.install,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firewall'] });
    },
  });
}

export function useConfigureFirewall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: ConfigureCSFDto) => firewallApi.configure(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firewall'] });
    },
  });
}

export function useEnableFirewall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: firewallApi.enable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firewall'] });
    },
  });
}

export function useDisableFirewall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: firewallApi.disable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firewall'] });
    },
  });
}

// LFD Hooks
export function useLFDInfo() {
  return useQuery({
    queryKey: ['firewall', 'lfd'],
    queryFn: firewallApi.getLfd,
  });
}

export function useUpdateLFD() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateLFDSettingsDto) => firewallApi.updateLfd(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firewall', 'lfd'] });
    },
  });
}

export function useAddLFDIgnore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ip, comment }: { ip: string; comment?: string }) => firewallApi.addLfdIgnore(ip, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firewall', 'lfd'] });
    },
  });
}

export function useRemoveLFDIgnore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ip: string) => firewallApi.removeLfdIgnore(ip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firewall', 'lfd'] });
    },
  });
}

export function useRestartLFD() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: firewallApi.restartLfd,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firewall', 'lfd'] });
    },
  });
}
