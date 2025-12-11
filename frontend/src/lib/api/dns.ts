import { apiClient } from './client';
import type {
  DnsZone,
  DnsRecord,
  CreateZoneDto,
  UpdateZoneDto,
  CreateRecordDto,
  UpdateRecordDto,
} from '@/types';

export const dnsApi = {
  // Zones
  getAllZones: async (domainId?: string): Promise<DnsZone[]> => {
    const params = domainId ? { domainId } : {};
    const response = await apiClient.get<DnsZone[]>('/dns/zones', { params });
    return response.data;
  },

  getZone: async (id: string): Promise<DnsZone> => {
    const response = await apiClient.get<DnsZone>(`/dns/zones/${id}`);
    return response.data;
  },

  createZone: async (data: CreateZoneDto): Promise<DnsZone> => {
    const response = await apiClient.post<DnsZone>('/dns/zones', data);
    return response.data;
  },

  updateZone: async (id: string, data: UpdateZoneDto): Promise<DnsZone> => {
    const response = await apiClient.patch<DnsZone>(`/dns/zones/${id}`, data);
    return response.data;
  },

  deleteZone: async (id: string): Promise<void> => {
    await apiClient.delete(`/dns/zones/${id}`);
  },

  applyTemplate: async (zoneId: string, templateName: string): Promise<DnsZone> => {
    const response = await apiClient.post<DnsZone>(`/dns/zones/${zoneId}/template`, {
      templateName,
    });
    return response.data;
  },

  // Records
  getRecords: async (zoneId: string): Promise<DnsRecord[]> => {
    const response = await apiClient.get<DnsRecord[]>(`/dns/zones/${zoneId}/records`);
    return response.data;
  },

  getRecord: async (id: string): Promise<DnsRecord> => {
    const response = await apiClient.get<DnsRecord>(`/dns/records/${id}`);
    return response.data;
  },

  createRecord: async (zoneId: string, data: CreateRecordDto): Promise<DnsRecord> => {
    const response = await apiClient.post<DnsRecord>(`/dns/zones/${zoneId}/records`, data);
    return response.data;
  },

  updateRecord: async (id: string, data: UpdateRecordDto): Promise<DnsRecord> => {
    const response = await apiClient.patch<DnsRecord>(`/dns/records/${id}`, data);
    return response.data;
  },

  deleteRecord: async (id: string): Promise<void> => {
    await apiClient.delete(`/dns/records/${id}`);
  },
};
