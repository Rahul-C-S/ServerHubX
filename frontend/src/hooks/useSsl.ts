import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sslApi } from '@/lib/api';
import type { RequestCertificateDto, UploadCertificateDto, RenewCertificateDto } from '@/types';

// Query Keys
export const sslKeys = {
  all: ['ssl'] as const,
  certificates: () => [...sslKeys.all, 'certificates'] as const,
  certificate: (domainId: string) => [...sslKeys.certificates(), domainId] as const,
};

// Queries
export function useCertificate(domainId: string) {
  return useQuery({
    queryKey: sslKeys.certificate(domainId),
    queryFn: () => sslApi.getCertificate(domainId),
    enabled: !!domainId,
  });
}

// Mutations
export function useRequestCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ domainId, data }: { domainId: string; data: RequestCertificateDto }) =>
      sslApi.requestCertificate(domainId, data),
    onSuccess: (certificate) => {
      queryClient.setQueryData(sslKeys.certificate(certificate.domain.id), certificate);
    },
  });
}

export function useUploadCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ domainId, data }: { domainId: string; data: UploadCertificateDto }) =>
      sslApi.uploadCertificate(domainId, data),
    onSuccess: (certificate) => {
      queryClient.setQueryData(sslKeys.certificate(certificate.domain.id), certificate);
    },
  });
}

export function useRenewCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ domainId, data }: { domainId: string; data?: RenewCertificateDto }) =>
      sslApi.renewCertificate(domainId, data),
    onSuccess: (certificate) => {
      queryClient.setQueryData(sslKeys.certificate(certificate.domain.id), certificate);
    },
  });
}

export function useRemoveCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (domainId: string) => sslApi.removeCertificate(domainId),
    onSuccess: (_data, domainId) => {
      queryClient.setQueryData(sslKeys.certificate(domainId), null);
    },
  });
}
