import { apiClient } from './client';
import type {
  SSHConfig,
  SSHSecuritySettings,
  SSHConnectionInfo,
  ChangeSSHPortDto,
  UpdateSSHSecurityDto,
  OperationResult,
} from '@/types/system';

export const sshApi = {
  getConfig: async (): Promise<SSHConfig> => {
    const response = await apiClient.get('/system/ssh/config');
    return response.data;
  },

  getPort: async (): Promise<{ port: number }> => {
    const response = await apiClient.get('/system/ssh/port');
    return response.data;
  },

  changePort: async (dto: ChangeSSHPortDto): Promise<OperationResult> => {
    const response = await apiClient.put('/system/ssh/port', dto);
    return response.data;
  },

  getSecuritySettings: async (): Promise<SSHSecuritySettings> => {
    const response = await apiClient.get('/system/ssh/security');
    return response.data;
  },

  updateSecuritySettings: async (dto: UpdateSSHSecurityDto): Promise<OperationResult> => {
    const response = await apiClient.patch('/system/ssh/security', dto);
    return response.data;
  },

  getConnectionInfo: async (): Promise<SSHConnectionInfo> => {
    const response = await apiClient.get('/system/ssh/connection-info');
    return response.data;
  },

  validateConfig: async (): Promise<{ valid: boolean; errors: string[] }> => {
    const response = await apiClient.get('/system/ssh/validate');
    return response.data;
  },
};
