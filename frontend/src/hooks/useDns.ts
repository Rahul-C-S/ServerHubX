import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dnsApi } from '@/lib/api';
import type {
  DnsZone,
  DnsRecord,
  CreateZoneDto,
  UpdateZoneDto,
  CreateRecordDto,
  UpdateRecordDto,
} from '@/types';

// Query Keys
export const dnsKeys = {
  all: ['dns'] as const,
  zones: () => [...dnsKeys.all, 'zones'] as const,
  zoneList: (domainId?: string) => [...dnsKeys.zones(), { domainId }] as const,
  zoneDetails: () => [...dnsKeys.zones(), 'detail'] as const,
  zoneDetail: (id: string) => [...dnsKeys.zoneDetails(), id] as const,
  records: (zoneId: string) => [...dnsKeys.zoneDetail(zoneId), 'records'] as const,
  record: (id: string) => [...dnsKeys.all, 'record', id] as const,
};

// Zone Queries
export function useDnsZones(domainId?: string) {
  return useQuery({
    queryKey: dnsKeys.zoneList(domainId),
    queryFn: () => dnsApi.getAllZones(domainId),
  });
}

export function useDnsZone(id: string) {
  return useQuery({
    queryKey: dnsKeys.zoneDetail(id),
    queryFn: () => dnsApi.getZone(id),
    enabled: !!id,
  });
}

// Record Queries
export function useDnsRecords(zoneId: string) {
  return useQuery({
    queryKey: dnsKeys.records(zoneId),
    queryFn: () => dnsApi.getRecords(zoneId),
    enabled: !!zoneId,
  });
}

export function useDnsRecord(id: string) {
  return useQuery({
    queryKey: dnsKeys.record(id),
    queryFn: () => dnsApi.getRecord(id),
    enabled: !!id,
  });
}

// Zone Mutations
export function useCreateDnsZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateZoneDto) => dnsApi.createZone(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dnsKeys.zones() });
    },
  });
}

export function useUpdateDnsZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateZoneDto }) =>
      dnsApi.updateZone(id, data),
    onSuccess: (zone: DnsZone) => {
      queryClient.setQueryData(dnsKeys.zoneDetail(zone.id), zone);
      queryClient.invalidateQueries({ queryKey: dnsKeys.zones() });
    },
  });
}

export function useDeleteDnsZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => dnsApi.deleteZone(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dnsKeys.zones() });
    },
  });
}

export function useApplyDnsTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ zoneId, templateName }: { zoneId: string; templateName: string }) =>
      dnsApi.applyTemplate(zoneId, templateName),
    onSuccess: (zone: DnsZone) => {
      queryClient.setQueryData(dnsKeys.zoneDetail(zone.id), zone);
      queryClient.invalidateQueries({ queryKey: dnsKeys.records(zone.id) });
    },
  });
}

// Record Mutations
export function useCreateDnsRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ zoneId, data }: { zoneId: string; data: CreateRecordDto }) =>
      dnsApi.createRecord(zoneId, data),
    onSuccess: (record: DnsRecord) => {
      queryClient.invalidateQueries({ queryKey: dnsKeys.records(record.zoneId) });
      queryClient.invalidateQueries({ queryKey: dnsKeys.zoneDetail(record.zoneId) });
    },
  });
}

export function useUpdateDnsRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRecordDto }) =>
      dnsApi.updateRecord(id, data),
    onSuccess: (record: DnsRecord) => {
      queryClient.setQueryData(dnsKeys.record(record.id), record);
      queryClient.invalidateQueries({ queryKey: dnsKeys.records(record.zoneId) });
    },
  });
}

export function useDeleteDnsRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; zoneId: string }) => dnsApi.deleteRecord(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: dnsKeys.records(variables.zoneId) });
    },
  });
}
