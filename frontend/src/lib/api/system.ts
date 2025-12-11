import { apiClient } from './client';
import type {
  SystemInfo,
  InstalledVersions,
  ServiceStatus,
  PackageUpdates,
  SettingValue,
  UpdateSettingDto,
  OperationResult,
} from '@/types/system';

export const systemApi = {
  // System Info
  getInfo: async (): Promise<SystemInfo> => {
    const response = await apiClient.get('/system/info');
    return response.data;
  },

  getVersions: async (): Promise<InstalledVersions> => {
    const response = await apiClient.get('/system/versions');
    return response.data;
  },

  // Services
  getServices: async (): Promise<ServiceStatus[]> => {
    const response = await apiClient.get('/system/services');
    return response.data;
  },

  startService: async (name: string): Promise<OperationResult> => {
    const response = await apiClient.post(`/system/services/${name}/start`);
    return response.data;
  },

  stopService: async (name: string): Promise<OperationResult> => {
    const response = await apiClient.post(`/system/services/${name}/stop`);
    return response.data;
  },

  restartService: async (name: string): Promise<OperationResult> => {
    const response = await apiClient.post(`/system/services/${name}/restart`);
    return response.data;
  },

  enableService: async (name: string): Promise<OperationResult> => {
    const response = await apiClient.post(`/system/services/${name}/enable`);
    return response.data;
  },

  disableService: async (name: string): Promise<OperationResult> => {
    const response = await apiClient.post(`/system/services/${name}/disable`);
    return response.data;
  },

  // Package Updates
  getUpdates: async (): Promise<PackageUpdates> => {
    const response = await apiClient.get('/system/updates');
    return response.data;
  },

  // Settings
  getSettings: async (): Promise<SettingValue[]> => {
    const response = await apiClient.get('/system/settings');
    return response.data;
  },

  getSettingsByPrefix: async (prefix: string): Promise<SettingValue[]> => {
    const response = await apiClient.get(`/system/settings/${prefix}`);
    return response.data;
  },

  updateSetting: async (dto: UpdateSettingDto): Promise<OperationResult> => {
    const response = await apiClient.patch('/system/settings', dto);
    return response.data;
  },

  updateSettings: async (settings: Array<{ key: string; value: string | number | boolean | object }>): Promise<OperationResult> => {
    const response = await apiClient.patch('/system/settings/batch', { settings });
    return response.data;
  },
};
