import { apiClient } from './client';
import type { LogEntry, LogFilter, LogStats, LogFile, LogSource } from '@/types/logs';

export const logsApi = {
  // Get log entries
  getLogs: async (filter?: LogFilter): Promise<LogEntry[]> => {
    const params = new URLSearchParams();
    if (filter?.source) params.append('source', filter.source);
    if (filter?.level) params.append('level', filter.level);
    if (filter?.search) params.append('search', filter.search);
    if (filter?.startDate) params.append('startDate', filter.startDate.toISOString());
    if (filter?.endDate) params.append('endDate', filter.endDate.toISOString());
    if (filter?.limit) params.append('limit', filter.limit.toString());
    if (filter?.offset) params.append('offset', filter.offset.toString());

    const response = await apiClient.get<LogEntry[]>(`/logs?${params.toString()}`);
    return response.data;
  },

  // Get log stats
  getStats: async (): Promise<LogStats> => {
    const response = await apiClient.get<LogStats>('/logs/stats');
    return response.data;
  },

  // Get available log files
  getLogFiles: async (): Promise<LogFile[]> => {
    const response = await apiClient.get<LogFile[]>('/logs/files');
    return response.data;
  },

  // Get logs from specific file
  getLogFile: async (
    path: string,
    options?: { lines?: number; tail?: boolean }
  ): Promise<string> => {
    const params = new URLSearchParams();
    if (options?.lines) params.append('lines', options.lines.toString());
    if (options?.tail) params.append('tail', 'true');

    const response = await apiClient.get<string>(
      `/logs/file?path=${encodeURIComponent(path)}&${params.toString()}`
    );
    return response.data;
  },

  // Get app logs
  getAppLogs: async (appId: string, lines?: number): Promise<string> => {
    const params = lines ? `?lines=${lines}` : '';
    const response = await apiClient.get<string>(`/apps/${appId}/logs${params}`);
    return response.data;
  },

  // Get domain access logs
  getDomainAccessLogs: async (domainId: string, lines?: number): Promise<string> => {
    const params = lines ? `?lines=${lines}` : '';
    const response = await apiClient.get<string>(`/domains/${domainId}/logs/access${params}`);
    return response.data;
  },

  // Get domain error logs
  getDomainErrorLogs: async (domainId: string, lines?: number): Promise<string> => {
    const params = lines ? `?lines=${lines}` : '';
    const response = await apiClient.get<string>(`/domains/${domainId}/logs/error${params}`);
    return response.data;
  },

  // Clear logs
  clearLogs: async (source: LogSource): Promise<void> => {
    await apiClient.delete(`/logs/${source}`);
  },

  // Download log file
  downloadLog: async (path: string): Promise<Blob> => {
    const response = await apiClient.get(`/logs/download?path=${encodeURIComponent(path)}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
