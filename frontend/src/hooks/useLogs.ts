import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logsApi } from '@/lib/api/logs';
import type { LogFilter, LogSource } from '@/types/logs';

export const useLogs = (filter?: LogFilter) => {
  return useQuery({
    queryKey: ['logs', filter],
    queryFn: () => logsApi.getLogs(filter),
    refetchInterval: 5000, // Refetch every 5 seconds for live updates
  });
};

export const useLogStats = () => {
  return useQuery({
    queryKey: ['logs', 'stats'],
    queryFn: () => logsApi.getStats(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useLogFiles = () => {
  return useQuery({
    queryKey: ['logs', 'files'],
    queryFn: () => logsApi.getLogFiles(),
  });
};

export const useLogFile = (path: string, options?: { lines?: number; tail?: boolean }) => {
  return useQuery({
    queryKey: ['logs', 'file', path, options],
    queryFn: () => logsApi.getLogFile(path, options),
    enabled: !!path,
    refetchInterval: options?.tail ? 2000 : false, // Live tail every 2 seconds
  });
};

export const useAppLogs = (appId: string, lines?: number) => {
  return useQuery({
    queryKey: ['logs', 'app', appId, lines],
    queryFn: () => logsApi.getAppLogs(appId, lines),
    enabled: !!appId,
    refetchInterval: 3000, // Refetch every 3 seconds
  });
};

export const useDomainAccessLogs = (domainId: string, lines?: number) => {
  return useQuery({
    queryKey: ['logs', 'domain', domainId, 'access', lines],
    queryFn: () => logsApi.getDomainAccessLogs(domainId, lines),
    enabled: !!domainId,
  });
};

export const useDomainErrorLogs = (domainId: string, lines?: number) => {
  return useQuery({
    queryKey: ['logs', 'domain', domainId, 'error', lines],
    queryFn: () => logsApi.getDomainErrorLogs(domainId, lines),
    enabled: !!domainId,
  });
};

export const useClearLogs = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (source: LogSource) => logsApi.clearLogs(source),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    },
  });
};

export const useDownloadLog = () => {
  return useMutation({
    mutationFn: async (path: string) => {
      const blob = await logsApi.downloadLog(path);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = path.split('/').pop() || 'log.txt';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });
};
