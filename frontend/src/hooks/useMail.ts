import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mailApi } from '@/lib/api';
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
} from '@/types';

// Query Keys
export const mailKeys = {
  all: ['mail'] as const,
  domains: () => [...mailKeys.all, 'domains'] as const,
  domainList: () => [...mailKeys.domains(), 'list'] as const,
  domainDetail: (id: string) => [...mailKeys.domains(), id] as const,
  mailboxes: (mailDomainId: string) => [...mailKeys.domainDetail(mailDomainId), 'mailboxes'] as const,
  mailbox: (id: string) => [...mailKeys.all, 'mailbox', id] as const,
  aliases: (mailDomainId: string) => [...mailKeys.domainDetail(mailDomainId), 'aliases'] as const,
  dnsRecords: (mailDomainId: string) => [...mailKeys.domainDetail(mailDomainId), 'dns'] as const,
  serviceStatus: () => [...mailKeys.all, 'status'] as const,
};

// Mail Domain Queries
export function useMailDomains() {
  return useQuery({
    queryKey: mailKeys.domainList(),
    queryFn: () => mailApi.getAllMailDomains(),
  });
}

export function useMailDomain(id: string) {
  return useQuery({
    queryKey: mailKeys.domainDetail(id),
    queryFn: () => mailApi.getMailDomain(id),
    enabled: !!id,
  });
}

export function useMailDnsRecords(mailDomainId: string, serverIp?: string) {
  return useQuery({
    queryKey: mailKeys.dnsRecords(mailDomainId),
    queryFn: () => mailApi.getDnsRecords(mailDomainId, serverIp),
    enabled: !!mailDomainId,
  });
}

export function useMailServiceStatus() {
  return useQuery({
    queryKey: mailKeys.serviceStatus(),
    queryFn: () => mailApi.getServiceStatus(),
  });
}

// Mail Domain Mutations
export function useEnableMailForDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ domainId, data }: { domainId: string; data: CreateMailDomainDto }) =>
      mailApi.enableMailForDomain(domainId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mailKeys.domains() });
    },
  });
}

export function useUpdateMailDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMailDomainDto }) =>
      mailApi.updateMailDomain(id, data),
    onSuccess: (mailDomain: MailDomain) => {
      queryClient.setQueryData(mailKeys.domainDetail(mailDomain.id), mailDomain);
      queryClient.invalidateQueries({ queryKey: mailKeys.domainList() });
    },
  });
}

export function useDisableMailForDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => mailApi.disableMailForDomain(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mailKeys.domains() });
    },
  });
}

// Mailbox Queries
export function useMailboxes(mailDomainId: string) {
  return useQuery({
    queryKey: mailKeys.mailboxes(mailDomainId),
    queryFn: () => mailApi.getMailboxes(mailDomainId),
    enabled: !!mailDomainId,
  });
}

export function useMailbox(id: string) {
  return useQuery({
    queryKey: mailKeys.mailbox(id),
    queryFn: () => mailApi.getMailbox(id),
    enabled: !!id,
  });
}

// Mailbox Mutations
export function useCreateMailbox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mailDomainId, data }: { mailDomainId: string; data: CreateMailboxDto }) =>
      mailApi.createMailbox(mailDomainId, data),
    onSuccess: (mailbox: Mailbox) => {
      queryClient.invalidateQueries({ queryKey: mailKeys.mailboxes(mailbox.mailDomain.id) });
      queryClient.invalidateQueries({ queryKey: mailKeys.domainDetail(mailbox.mailDomain.id) });
    },
  });
}

export function useUpdateMailbox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMailboxDto }) =>
      mailApi.updateMailbox(id, data),
    onSuccess: (mailbox: Mailbox) => {
      queryClient.setQueryData(mailKeys.mailbox(mailbox.id), mailbox);
      queryClient.invalidateQueries({ queryKey: mailKeys.mailboxes(mailbox.mailDomain.id) });
    },
  });
}

export function useDeleteMailbox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; mailDomainId: string }) => mailApi.deleteMailbox(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: mailKeys.mailboxes(variables.mailDomainId) });
    },
  });
}

// Alias Queries
export function useMailAliases(mailDomainId: string) {
  return useQuery({
    queryKey: mailKeys.aliases(mailDomainId),
    queryFn: () => mailApi.getAliases(mailDomainId),
    enabled: !!mailDomainId,
  });
}

// Alias Mutations
export function useCreateMailAlias() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mailDomainId, data }: { mailDomainId: string; data: CreateMailAliasDto }) =>
      mailApi.createAlias(mailDomainId, data),
    onSuccess: (alias: MailAlias) => {
      queryClient.invalidateQueries({ queryKey: mailKeys.aliases(alias.mailDomain.id) });
    },
  });
}

export function useUpdateMailAlias() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMailAliasDto }) =>
      mailApi.updateAlias(id, data),
    onSuccess: (alias: MailAlias) => {
      queryClient.invalidateQueries({ queryKey: mailKeys.aliases(alias.mailDomain.id) });
    },
  });
}

export function useDeleteMailAlias() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; mailDomainId: string }) => mailApi.deleteAlias(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: mailKeys.aliases(variables.mailDomainId) });
    },
  });
}
