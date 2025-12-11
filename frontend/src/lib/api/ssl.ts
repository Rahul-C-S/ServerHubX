import { apiClient } from './client';
import type {
  Certificate,
  RequestCertificateDto,
  UploadCertificateDto,
  RenewCertificateDto,
} from '@/types';

export const sslApi = {
  getCertificate: async (domainId: string): Promise<Certificate | null> => {
    try {
      const response = await apiClient.get<Certificate>(`/domains/${domainId}/ssl`);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { status: number } };
      if (err.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  requestCertificate: async (
    domainId: string,
    data: RequestCertificateDto,
  ): Promise<Certificate> => {
    const response = await apiClient.post<Certificate>(`/domains/${domainId}/ssl/request`, data);
    return response.data;
  },

  uploadCertificate: async (
    domainId: string,
    data: UploadCertificateDto,
  ): Promise<Certificate> => {
    const response = await apiClient.post<Certificate>(`/domains/${domainId}/ssl/upload`, data);
    return response.data;
  },

  renewCertificate: async (
    domainId: string,
    data?: RenewCertificateDto,
  ): Promise<Certificate> => {
    const response = await apiClient.post<Certificate>(`/domains/${domainId}/ssl/renew`, data || {});
    return response.data;
  },

  removeCertificate: async (domainId: string): Promise<void> => {
    await apiClient.delete(`/domains/${domainId}/ssl`);
  },
};
