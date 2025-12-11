import { apiClient } from './client';
import type { CronJob, CreateCronJobDto, UpdateCronJobDto, CronJobRunResult } from '@/types';

export const cronApi = {
  getAll: async (domainId?: string): Promise<CronJob[]> => {
    const params = domainId ? { domainId } : {};
    const response = await apiClient.get<CronJob[]>('/cron', { params });
    return response.data;
  },

  getOne: async (id: string): Promise<CronJob> => {
    const response = await apiClient.get<CronJob>(`/cron/${id}`);
    return response.data;
  },

  create: async (data: CreateCronJobDto): Promise<CronJob> => {
    const response = await apiClient.post<CronJob>('/cron', data);
    return response.data;
  },

  update: async (id: string, data: UpdateCronJobDto): Promise<CronJob> => {
    const response = await apiClient.patch<CronJob>(`/cron/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/cron/${id}`);
  },

  run: async (id: string): Promise<CronJobRunResult> => {
    const response = await apiClient.post<CronJobRunResult>(`/cron/${id}/run`);
    return response.data;
  },

  pause: async (id: string): Promise<CronJob> => {
    const response = await apiClient.post<CronJob>(`/cron/${id}/pause`);
    return response.data;
  },

  resume: async (id: string): Promise<CronJob> => {
    const response = await apiClient.post<CronJob>(`/cron/${id}/resume`);
    return response.data;
  },
};
