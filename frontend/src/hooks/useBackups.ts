import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { backupsApi } from '@/lib/api';
import type {
  Backup,
  BackupSchedule,
  CreateBackupDto,
  CreateBackupScheduleDto,
  UpdateBackupScheduleDto,
} from '@/types';

// Query Keys
export const backupKeys = {
  all: ['backups'] as const,
  lists: () => [...backupKeys.all, 'list'] as const,
  list: (filters?: { domainId?: string; type?: string; status?: string }) =>
    [...backupKeys.lists(), filters] as const,
  details: () => [...backupKeys.all, 'detail'] as const,
  detail: (id: string) => [...backupKeys.details(), id] as const,
  schedules: () => [...backupKeys.all, 'schedules'] as const,
  scheduleList: (domainId?: string) => [...backupKeys.schedules(), { domainId }] as const,
  schedule: (id: string) => [...backupKeys.schedules(), id] as const,
};

// Backup Queries
export function useBackups(filters?: { domainId?: string; type?: string; status?: string }) {
  return useQuery({
    queryKey: backupKeys.list(filters),
    queryFn: () => backupsApi.getAll(filters),
  });
}

export function useBackup(id: string) {
  return useQuery({
    queryKey: backupKeys.detail(id),
    queryFn: () => backupsApi.getOne(id),
    enabled: !!id,
  });
}

// Backup Mutations
export function useCreateBackup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBackupDto) => backupsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: backupKeys.lists() });
    },
  });
}

export function useDeleteBackup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => backupsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: backupKeys.lists() });
    },
  });
}

export function useRestoreBackup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => backupsApi.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: backupKeys.lists() });
    },
  });
}

export function useDownloadBackup() {
  return useMutation({
    mutationFn: (id: string) => backupsApi.download(id),
  });
}

// Schedule Queries
export function useBackupSchedules(domainId?: string) {
  return useQuery({
    queryKey: backupKeys.scheduleList(domainId),
    queryFn: () => backupsApi.getSchedules(domainId),
  });
}

export function useBackupSchedule(id: string) {
  return useQuery({
    queryKey: backupKeys.schedule(id),
    queryFn: () => backupsApi.getSchedule(id),
    enabled: !!id,
  });
}

// Schedule Mutations
export function useCreateBackupSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBackupScheduleDto) => backupsApi.createSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: backupKeys.schedules() });
    },
  });
}

export function useUpdateBackupSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBackupScheduleDto }) =>
      backupsApi.updateSchedule(id, data),
    onSuccess: (_data: BackupSchedule, variables) => {
      queryClient.invalidateQueries({ queryKey: backupKeys.schedule(variables.id) });
      queryClient.invalidateQueries({ queryKey: backupKeys.schedules() });
    },
  });
}

export function useDeleteBackupSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => backupsApi.deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: backupKeys.schedules() });
    },
  });
}

export function useRunBackupSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => backupsApi.runSchedule(id),
    onSuccess: (_data: Backup) => {
      queryClient.invalidateQueries({ queryKey: backupKeys.lists() });
    },
  });
}
