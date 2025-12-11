import { apiClient } from './client';
import type {
  Database,
  DatabaseUser,
  CreateDatabaseDto,
  CreateDatabaseUserDto,
  UpdateDatabaseUserDto,
} from '@/types';

export const databasesApi = {
  // Database CRUD
  getAll: async (ownerId?: string): Promise<Database[]> => {
    const params = ownerId ? { ownerId } : {};
    const response = await apiClient.get<Database[]>('/databases', { params });
    return response.data;
  },

  getOne: async (id: string): Promise<Database> => {
    const response = await apiClient.get<Database>(`/databases/${id}`);
    return response.data;
  },

  create: async (data: CreateDatabaseDto): Promise<Database> => {
    const response = await apiClient.post<Database>('/databases', data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/databases/${id}`);
  },

  refreshStats: async (id: string): Promise<Database> => {
    const response = await apiClient.post<Database>(`/databases/${id}/refresh-stats`);
    return response.data;
  },

  // Database Users
  getUsers: async (databaseId: string): Promise<DatabaseUser[]> => {
    const response = await apiClient.get<DatabaseUser[]>(`/databases/${databaseId}/users`);
    return response.data;
  },

  createUser: async (databaseId: string, data: CreateDatabaseUserDto): Promise<DatabaseUser> => {
    const response = await apiClient.post<DatabaseUser>(`/databases/${databaseId}/users`, data);
    return response.data;
  },

  updateUser: async (
    databaseId: string,
    userId: string,
    data: UpdateDatabaseUserDto
  ): Promise<DatabaseUser> => {
    const response = await apiClient.patch<DatabaseUser>(
      `/databases/${databaseId}/users/${userId}`,
      data
    );
    return response.data;
  },

  deleteUser: async (databaseId: string, userId: string): Promise<void> => {
    await apiClient.delete(`/databases/${databaseId}/users/${userId}`);
  },

  // Backup and Restore
  backup: async (id: string, outputPath: string): Promise<{ success: boolean; path: string }> => {
    const response = await apiClient.post<{ success: boolean; path: string }>(
      `/databases/${id}/backup`,
      { outputPath }
    );
    return response.data;
  },

  restore: async (id: string, inputPath: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(
      `/databases/${id}/restore`,
      { inputPath }
    );
    return response.data;
  },

  importSQL: async (id: string, sql: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(
      `/databases/${id}/import`,
      { sql }
    );
    return response.data;
  },

  exportTable: async (
    id: string,
    table: string,
    format: 'sql' | 'csv' = 'sql'
  ): Promise<{ success: boolean; data: string }> => {
    const response = await apiClient.get<{ success: boolean; data: string }>(
      `/databases/${id}/export/${table}`,
      { params: { format } }
    );
    return response.data;
  },
};
