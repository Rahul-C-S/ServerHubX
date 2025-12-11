import { apiClient } from './client';
import type {
  Backup,
  BackupSchedule,
  CreateBackupDto,
  CreateBackupScheduleDto,
  UpdateBackupScheduleDto,
} from '@/types';

export const backupsApi = {
  // Backups
  getAll: async (params?: { domainId?: string; type?: string; status?: string }): Promise<Backup[]> => {
    const response = await apiClient.get<Backup[]>('/backups', { params });
    return response.data;
  },

  getOne: async (id: string): Promise<Backup> => {
    const response = await apiClient.get<Backup>(`/backups/${id}`);
    return response.data;
  },

  create: async (data: CreateBackupDto): Promise<Backup> => {
    const response = await apiClient.post<Backup>('/backups', data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/backups/${id}`);
  },

  restore: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      `/backups/${id}/restore`
    );
    return response.data;
  },

  download: async (id: string): Promise<{ url: string }> => {
    const response = await apiClient.get<{ url: string }>(`/backups/${id}/download`);
    return response.data;
  },

  // Backup Schedules
  getSchedules: async (domainId?: string): Promise<BackupSchedule[]> => {
    const params = domainId ? { domainId } : {};
    const response = await apiClient.get<BackupSchedule[]>('/backups/schedules', { params });
    return response.data;
  },

  getSchedule: async (id: string): Promise<BackupSchedule> => {
    const response = await apiClient.get<BackupSchedule>(`/backups/schedules/${id}`);
    return response.data;
  },

  createSchedule: async (data: CreateBackupScheduleDto): Promise<BackupSchedule> => {
    const response = await apiClient.post<BackupSchedule>('/backups/schedules', data);
    return response.data;
  },

  updateSchedule: async (id: string, data: UpdateBackupScheduleDto): Promise<BackupSchedule> => {
    const response = await apiClient.patch<BackupSchedule>(`/backups/schedules/${id}`, data);
    return response.data;
  },

  deleteSchedule: async (id: string): Promise<void> => {
    await apiClient.delete(`/backups/schedules/${id}`);
  },

  runSchedule: async (id: string): Promise<Backup> => {
    const response = await apiClient.post<Backup>(`/backups/schedules/${id}/run`);
    return response.data;
  },
};
