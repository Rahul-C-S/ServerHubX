import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { domainsApi } from '@/lib/api';
import type {
  CreateDomainRequest,
  UpdateDomainRequest,
} from '@/types';

const DOMAINS_KEY = 'domains';

export function useDomains(ownerId?: string) {
  return useQuery({
    queryKey: [DOMAINS_KEY, { ownerId }],
    queryFn: () => domainsApi.list(ownerId),
  });
}

export function useDomain(id: string) {
  return useQuery({
    queryKey: [DOMAINS_KEY, id],
    queryFn: () => domainsApi.get(id),
    enabled: !!id,
  });
}

export function useDomainStats(id: string) {
  return useQuery({
    queryKey: [DOMAINS_KEY, id, 'stats'],
    queryFn: () => domainsApi.getStats(id),
    enabled: !!id,
  });
}

export function useCreateDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDomainRequest) => domainsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DOMAINS_KEY] });
    },
  });
}

export function useUpdateDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDomainRequest }) =>
      domainsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [DOMAINS_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: [DOMAINS_KEY] });
    },
  });
}

export function useDeleteDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => domainsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DOMAINS_KEY] });
    },
  });
}

export function useSuspendDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => domainsApi.suspend(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [DOMAINS_KEY, id] });
      queryClient.invalidateQueries({ queryKey: [DOMAINS_KEY] });
    },
  });
}

export function useUnsuspendDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => domainsApi.unsuspend(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [DOMAINS_KEY, id] });
      queryClient.invalidateQueries({ queryKey: [DOMAINS_KEY] });
    },
  });
}

export function useSubdomains(domainId: string) {
  return useQuery({
    queryKey: [DOMAINS_KEY, domainId, 'subdomains'],
    queryFn: () => domainsApi.listSubdomains(domainId),
    enabled: !!domainId,
  });
}

export function useCreateSubdomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      domainId,
      data,
    }: {
      domainId: string;
      data: { name: string; runtimeType?: string; phpVersion?: string };
    }) => domainsApi.createSubdomain(domainId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [DOMAINS_KEY, variables.domainId, 'subdomains'],
      });
    },
  });
}

export function useDeleteSubdomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      domainId,
      subdomainId,
    }: {
      domainId: string;
      subdomainId: string;
    }) => domainsApi.deleteSubdomain(domainId, subdomainId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [DOMAINS_KEY, variables.domainId, 'subdomains'],
      });
    },
  });
}
