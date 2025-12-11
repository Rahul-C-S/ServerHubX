import { apiClient } from './client';
import type {
  Domain,
  DomainStats,
  Subdomain,
  CreateDomainRequest,
  UpdateDomainRequest,
} from '@/types';

export const domainsApi = {
  list: async (ownerId?: string): Promise<Domain[]> => {
    const params = ownerId ? { ownerId } : {};
    const response = await apiClient.get<Domain[]>('/domains', { params });
    return response.data;
  },

  get: async (id: string): Promise<Domain> => {
    const response = await apiClient.get<Domain>(`/domains/${id}`);
    return response.data;
  },

  create: async (data: CreateDomainRequest): Promise<Domain> => {
    const response = await apiClient.post<Domain>('/domains', data);
    return response.data;
  },

  update: async (id: string, data: UpdateDomainRequest): Promise<Domain> => {
    const response = await apiClient.patch<Domain>(`/domains/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/domains/${id}`);
  },

  suspend: async (id: string): Promise<Domain> => {
    const response = await apiClient.post<Domain>(`/domains/${id}/suspend`);
    return response.data;
  },

  unsuspend: async (id: string): Promise<Domain> => {
    const response = await apiClient.post<Domain>(`/domains/${id}/unsuspend`);
    return response.data;
  },

  getStats: async (id: string): Promise<DomainStats> => {
    const response = await apiClient.get<DomainStats>(`/domains/${id}/stats`);
    return response.data;
  },

  listSubdomains: async (domainId: string): Promise<Subdomain[]> => {
    const response = await apiClient.get<Subdomain[]>(
      `/domains/${domainId}/subdomains`
    );
    return response.data;
  },

  createSubdomain: async (
    domainId: string,
    data: { name: string; runtimeType?: string; phpVersion?: string }
  ): Promise<Subdomain> => {
    const response = await apiClient.post<Subdomain>(
      `/domains/${domainId}/subdomains`,
      data
    );
    return response.data;
  },

  deleteSubdomain: async (
    domainId: string,
    subdomainId: string
  ): Promise<void> => {
    await apiClient.delete(`/domains/${domainId}/subdomains/${subdomainId}`);
  },
};
