import { apiClient } from './client';
import type {
  SystemUser,
  SSHKey,
  CreateSystemUserRequest,
  AddSSHKeyRequest,
} from '@/types';

export const systemUsersApi = {
  list: async (ownerId?: string): Promise<SystemUser[]> => {
    const params = ownerId ? { ownerId } : {};
    const response = await apiClient.get<SystemUser[]>('/system-users', { params });
    return response.data;
  },

  get: async (id: string): Promise<SystemUser & { sshKeys?: SSHKey[] }> => {
    const response = await apiClient.get<SystemUser & { sshKeys?: SSHKey[] }>(
      `/system-users/${id}`
    );
    return response.data;
  },

  create: async (data: CreateSystemUserRequest): Promise<SystemUser> => {
    const response = await apiClient.post<SystemUser>('/system-users', data);
    return response.data;
  },

  update: async (
    id: string,
    data: Partial<CreateSystemUserRequest & { status?: string }>
  ): Promise<SystemUser> => {
    const response = await apiClient.patch<SystemUser>(
      `/system-users/${id}`,
      data
    );
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/system-users/${id}`);
  },

  setPassword: async (id: string, password: string): Promise<void> => {
    await apiClient.post(`/system-users/${id}/password`, { password });
  },

  getQuotaUsage: async (
    id: string
  ): Promise<{ diskUsedMb: number; inodeUsed: number }> => {
    const response = await apiClient.get<{
      diskUsedMb: number;
      inodeUsed: number;
    }>(`/system-users/${id}/quota`);
    return response.data;
  },

  listSSHKeys: async (systemUserId: string): Promise<SSHKey[]> => {
    const response = await apiClient.get<SSHKey[]>(
      `/system-users/${systemUserId}/ssh-keys`
    );
    return response.data;
  },

  addSSHKey: async (
    systemUserId: string,
    data: AddSSHKeyRequest
  ): Promise<SSHKey> => {
    const response = await apiClient.post<SSHKey>(
      `/system-users/${systemUserId}/ssh-keys`,
      data
    );
    return response.data;
  },

  removeSSHKey: async (
    systemUserId: string,
    keyId: string
  ): Promise<void> => {
    await apiClient.delete(`/system-users/${systemUserId}/ssh-keys/${keyId}`);
  },
};
