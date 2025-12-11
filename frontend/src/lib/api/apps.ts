import { apiClient } from './client';
import type {
  App,
  AppEnvironment,
  CreateAppDto,
  UpdateAppDto,
  EnvVariable,
  DeploymentStatus,
  AppLogs,
} from '@/types';

export const appsApi = {
  getAll: async (domainId?: string): Promise<App[]> => {
    const params = domainId ? { domainId } : {};
    const { data } = await apiClient.get('/apps', { params });
    return data;
  },

  getById: async (id: string): Promise<App> => {
    const { data } = await apiClient.get(`/apps/${id}`);
    return data;
  },

  create: async (dto: CreateAppDto): Promise<App> => {
    const { data } = await apiClient.post('/apps', dto);
    return data;
  },

  update: async (id: string, dto: UpdateAppDto): Promise<App> => {
    const { data } = await apiClient.patch(`/apps/${id}`, dto);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/apps/${id}`);
  },

  // Process control
  start: async (id: string): Promise<App> => {
    const { data } = await apiClient.post(`/apps/${id}/start`);
    return data;
  },

  stop: async (id: string): Promise<App> => {
    const { data } = await apiClient.post(`/apps/${id}/stop`);
    return data;
  },

  restart: async (id: string): Promise<App> => {
    const { data } = await apiClient.post(`/apps/${id}/restart`);
    return data;
  },

  reload: async (id: string): Promise<App> => {
    const { data } = await apiClient.post(`/apps/${id}/reload`);
    return data;
  },

  // Deployments
  deploy: async (id: string): Promise<{ jobId: string; message: string }> => {
    const { data } = await apiClient.post(`/apps/${id}/deploy`);
    return data;
  },

  getDeployments: async (id: string, limit?: number): Promise<DeploymentStatus[]> => {
    const params = limit ? { limit } : {};
    const { data } = await apiClient.get(`/apps/${id}/deployments`, { params });
    return data;
  },

  getDeploymentStatus: async (appId: string, jobId: string): Promise<DeploymentStatus> => {
    const { data } = await apiClient.get(`/apps/${appId}/deployments/${jobId}`);
    return data;
  },

  cancelDeployment: async (appId: string, jobId: string): Promise<{ cancelled: boolean }> => {
    const { data } = await apiClient.post(`/apps/${appId}/deployments/${jobId}/cancel`);
    return data;
  },

  retryDeployment: async (appId: string, jobId: string): Promise<{ jobId: string }> => {
    const { data } = await apiClient.post(`/apps/${appId}/deployments/${jobId}/retry`);
    return data;
  },

  // Logs
  getLogs: async (id: string, lines?: number): Promise<AppLogs> => {
    const params = lines ? { lines } : {};
    const { data } = await apiClient.get(`/apps/${id}/logs`, { params });
    return data;
  },

  flushLogs: async (id: string): Promise<void> => {
    await apiClient.delete(`/apps/${id}/logs`);
  },

  // Environment variables
  getEnv: async (id: string): Promise<AppEnvironment[]> => {
    const { data } = await apiClient.get(`/apps/${id}/env`);
    return data;
  },

  setEnv: async (id: string, variables: EnvVariable[]): Promise<AppEnvironment[]> => {
    const { data } = await apiClient.put(`/apps/${id}/env`, { variables });
    return data;
  },

  deleteEnv: async (id: string, keys: string[]): Promise<void> => {
    await apiClient.delete(`/apps/${id}/env`, { data: { keys } });
  },
};
