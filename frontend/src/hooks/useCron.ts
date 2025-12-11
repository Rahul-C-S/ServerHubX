import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cronApi } from '@/lib/api';
import type { CronJob, CreateCronJobDto, UpdateCronJobDto } from '@/types';

// Query Keys
export const cronKeys = {
  all: ['cron'] as const,
  lists: () => [...cronKeys.all, 'list'] as const,
  list: (domainId?: string) => [...cronKeys.lists(), { domainId }] as const,
  details: () => [...cronKeys.all, 'detail'] as const,
  detail: (id: string) => [...cronKeys.details(), id] as const,
};

// Queries
export function useCronJobs(domainId?: string) {
  return useQuery({
    queryKey: cronKeys.list(domainId),
    queryFn: () => cronApi.getAll(domainId),
  });
}

export function useCronJob(id: string) {
  return useQuery({
    queryKey: cronKeys.detail(id),
    queryFn: () => cronApi.getOne(id),
    enabled: !!id,
  });
}

// Mutations
export function useCreateCronJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCronJobDto) => cronApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cronKeys.lists() });
    },
  });
}

export function useUpdateCronJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCronJobDto }) => cronApi.update(id, data),
    onSuccess: (_data: CronJob, variables) => {
      queryClient.invalidateQueries({ queryKey: cronKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: cronKeys.lists() });
    },
  });
}

export function useDeleteCronJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cronApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cronKeys.lists() });
    },
  });
}

export function useRunCronJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cronApi.run(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: cronKeys.detail(variables) });
      queryClient.invalidateQueries({ queryKey: cronKeys.lists() });
    },
  });
}

export function usePauseCronJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cronApi.pause(id),
    onSuccess: (_data: CronJob, variables) => {
      queryClient.invalidateQueries({ queryKey: cronKeys.detail(variables) });
      queryClient.invalidateQueries({ queryKey: cronKeys.lists() });
    },
  });
}

export function useResumeCronJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cronApi.resume(id),
    onSuccess: (_data: CronJob, variables) => {
      queryClient.invalidateQueries({ queryKey: cronKeys.detail(variables) });
      queryClient.invalidateQueries({ queryKey: cronKeys.lists() });
    },
  });
}
