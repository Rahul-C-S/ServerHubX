import { apiClient } from './client';
import type {
  MailDomain,
  Mailbox,
  MailAlias,
  CreateMailDomainDto,
  UpdateMailDomainDto,
  CreateMailboxDto,
  UpdateMailboxDto,
  CreateMailAliasDto,
  UpdateMailAliasDto,
  MailDnsRecords,
  MailServiceStatus,
} from '@/types';

export const mailApi = {
  // Mail Domains
  getAllMailDomains: async (): Promise<MailDomain[]> => {
    const response = await apiClient.get<MailDomain[]>('/mail/domains');
    return response.data;
  },

  getMailDomain: async (id: string): Promise<MailDomain> => {
    const response = await apiClient.get<MailDomain>(`/mail/domains/${id}`);
    return response.data;
  },

  enableMailForDomain: async (
    domainId: string,
    data: CreateMailDomainDto,
  ): Promise<MailDomain> => {
    const response = await apiClient.post<MailDomain>(
      `/mail/domains/${domainId}/enable`,
      data,
    );
    return response.data;
  },

  updateMailDomain: async (id: string, data: UpdateMailDomainDto): Promise<MailDomain> => {
    const response = await apiClient.put<MailDomain>(`/mail/domains/${id}`, data);
    return response.data;
  },

  disableMailForDomain: async (id: string): Promise<void> => {
    await apiClient.delete(`/mail/domains/${id}`);
  },

  getDnsRecords: async (id: string, serverIp?: string): Promise<MailDnsRecords> => {
    const params = serverIp ? { serverIp } : {};
    const response = await apiClient.get<MailDnsRecords>(`/mail/domains/${id}/dns-records`, {
      params,
    });
    return response.data;
  },

  // Mailboxes
  getMailboxes: async (mailDomainId: string): Promise<Mailbox[]> => {
    const response = await apiClient.get<Mailbox[]>(
      `/mail/domains/${mailDomainId}/mailboxes`,
    );
    return response.data;
  },

  getMailbox: async (id: string): Promise<Mailbox> => {
    const response = await apiClient.get<Mailbox>(`/mail/mailboxes/${id}`);
    return response.data;
  },

  createMailbox: async (
    mailDomainId: string,
    data: CreateMailboxDto,
  ): Promise<Mailbox> => {
    const response = await apiClient.post<Mailbox>(
      `/mail/domains/${mailDomainId}/mailboxes`,
      data,
    );
    return response.data;
  },

  updateMailbox: async (id: string, data: UpdateMailboxDto): Promise<Mailbox> => {
    const response = await apiClient.put<Mailbox>(`/mail/mailboxes/${id}`, data);
    return response.data;
  },

  deleteMailbox: async (id: string): Promise<void> => {
    await apiClient.delete(`/mail/mailboxes/${id}`);
  },

  // Mail Aliases
  getAliases: async (mailDomainId: string): Promise<MailAlias[]> => {
    const response = await apiClient.get<MailAlias[]>(
      `/mail/domains/${mailDomainId}/aliases`,
    );
    return response.data;
  },

  createAlias: async (
    mailDomainId: string,
    data: CreateMailAliasDto,
  ): Promise<MailAlias> => {
    const response = await apiClient.post<MailAlias>(
      `/mail/domains/${mailDomainId}/aliases`,
      data,
    );
    return response.data;
  },

  updateAlias: async (id: string, data: UpdateMailAliasDto): Promise<MailAlias> => {
    const response = await apiClient.put<MailAlias>(`/mail/aliases/${id}`, data);
    return response.data;
  },

  deleteAlias: async (id: string): Promise<void> => {
    await apiClient.delete(`/mail/aliases/${id}`);
  },

  // Service Status
  getServiceStatus: async (): Promise<MailServiceStatus> => {
    const response = await apiClient.get<MailServiceStatus>('/mail/status');
    return response.data;
  },
};
