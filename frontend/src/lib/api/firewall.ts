import { apiClient } from './client';
import type {
  FirewallStatus,
  AllowedPorts,
  IPLists,
  FirewallRule,
  LFDInfo,
  AllowPortDto,
  BlockIpDto,
  TempBlockIpDto,
  UpdateLFDSettingsDto,
  ConfigureCSFDto,
  OperationResult,
  FirewallProtocol,
  FirewallDirection,
} from '@/types/system';

export const firewallApi = {
  // Status
  getStatus: async (): Promise<FirewallStatus> => {
    const response = await apiClient.get('/system/firewall/status');
    return response.data;
  },

  // Ports
  getPorts: async (): Promise<AllowedPorts> => {
    const response = await apiClient.get('/system/firewall/ports');
    return response.data;
  },

  allowPort: async (dto: AllowPortDto): Promise<OperationResult> => {
    const response = await apiClient.post('/system/firewall/ports', dto);
    return response.data;
  },

  denyPort: async (
    port: number,
    protocol?: FirewallProtocol,
    direction?: FirewallDirection,
  ): Promise<OperationResult> => {
    const response = await apiClient.delete(`/system/firewall/ports/${port}`, {
      data: { port, protocol, direction },
    });
    return response.data;
  },

  // IP Management
  getIps: async (): Promise<IPLists> => {
    const response = await apiClient.get('/system/firewall/ips');
    return response.data;
  },

  allowIp: async (ip: string, comment?: string): Promise<OperationResult> => {
    const response = await apiClient.post('/system/firewall/ips/allow', { ip, comment });
    return response.data;
  },

  blockIp: async (dto: BlockIpDto): Promise<OperationResult> => {
    const response = await apiClient.post('/system/firewall/ips/block', dto);
    return response.data;
  },

  tempBlockIp: async (dto: TempBlockIpDto): Promise<OperationResult> => {
    const response = await apiClient.post('/system/firewall/ips/temp-block', dto);
    return response.data;
  },

  unblockIp: async (ip: string): Promise<OperationResult> => {
    const response = await apiClient.delete(`/system/firewall/ips/${encodeURIComponent(ip)}`);
    return response.data;
  },

  // Firewall Rules
  getRules: async (): Promise<FirewallRule[]> => {
    const response = await apiClient.get('/system/firewall/rules');
    return response.data;
  },

  // CSF Control
  restart: async (): Promise<OperationResult> => {
    const response = await apiClient.post('/system/firewall/restart');
    return response.data;
  },

  reload: async (): Promise<OperationResult> => {
    const response = await apiClient.post('/system/firewall/reload');
    return response.data;
  },

  install: async (): Promise<OperationResult> => {
    const response = await apiClient.post('/system/firewall/install');
    return response.data;
  },

  configure: async (dto: ConfigureCSFDto): Promise<OperationResult> => {
    const response = await apiClient.post('/system/firewall/configure', dto);
    return response.data;
  },

  enable: async (): Promise<OperationResult> => {
    const response = await apiClient.post('/system/firewall/enable');
    return response.data;
  },

  disable: async (): Promise<OperationResult> => {
    const response = await apiClient.post('/system/firewall/disable');
    return response.data;
  },

  // LFD
  getLfd: async (): Promise<LFDInfo> => {
    const response = await apiClient.get('/system/firewall/lfd');
    return response.data;
  },

  updateLfd: async (dto: UpdateLFDSettingsDto): Promise<OperationResult> => {
    const response = await apiClient.patch('/system/firewall/lfd', dto);
    return response.data;
  },

  addLfdIgnore: async (ip: string, comment?: string): Promise<OperationResult> => {
    const response = await apiClient.post('/system/firewall/lfd/ignore', { ip, comment });
    return response.data;
  },

  removeLfdIgnore: async (ip: string): Promise<OperationResult> => {
    const response = await apiClient.delete(`/system/firewall/lfd/ignore/${encodeURIComponent(ip)}`);
    return response.data;
  },

  restartLfd: async (): Promise<OperationResult> => {
    const response = await apiClient.post('/system/firewall/lfd/restart');
    return response.data;
  },
};
