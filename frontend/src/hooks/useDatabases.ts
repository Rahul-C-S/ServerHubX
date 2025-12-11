import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databasesApi } from '@/lib/api';
import type {
  Database,
  DatabaseUser,
  CreateDatabaseDto,
  CreateDatabaseUserDto,
  UpdateDatabaseUserDto,
} from '@/types';

// Query Keys
export const databaseKeys = {
  all: ['databases'] as const,
  lists: () => [...databaseKeys.all, 'list'] as const,
  list: (ownerId?: string) => [...databaseKeys.lists(), { ownerId }] as const,
  details: () => [...databaseKeys.all, 'detail'] as const,
  detail: (id: string) => [...databaseKeys.details(), id] as const,
  users: (databaseId: string) => [...databaseKeys.detail(databaseId), 'users'] as const,
};

// Queries
export function useDatabases(ownerId?: string) {
  return useQuery({
    queryKey: databaseKeys.list(ownerId),
    queryFn: () => databasesApi.getAll(ownerId),
  });
}

export function useDatabase(id: string) {
  return useQuery({
    queryKey: databaseKeys.detail(id),
    queryFn: () => databasesApi.getOne(id),
    enabled: !!id,
  });
}

export function useDatabaseUsers(databaseId: string) {
  return useQuery({
    queryKey: databaseKeys.users(databaseId),
    queryFn: () => databasesApi.getUsers(databaseId),
    enabled: !!databaseId,
  });
}

// Mutations
export function useCreateDatabase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDatabaseDto) => databasesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: databaseKeys.lists() });
    },
  });
}

export function useDeleteDatabase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => databasesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: databaseKeys.lists() });
    },
  });
}

export function useRefreshDatabaseStats() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => databasesApi.refreshStats(id),
    onSuccess: (data: Database) => {
      queryClient.setQueryData(databaseKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: databaseKeys.lists() });
    },
  });
}

// Database User Mutations
export function useCreateDatabaseUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ databaseId, data }: { databaseId: string; data: CreateDatabaseUserDto }) =>
      databasesApi.createUser(databaseId, data),
    onSuccess: (_data: DatabaseUser, variables) => {
      queryClient.invalidateQueries({ queryKey: databaseKeys.users(variables.databaseId) });
      queryClient.invalidateQueries({ queryKey: databaseKeys.detail(variables.databaseId) });
    },
  });
}

export function useUpdateDatabaseUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      databaseId,
      userId,
      data,
    }: {
      databaseId: string;
      userId: string;
      data: UpdateDatabaseUserDto;
    }) => databasesApi.updateUser(databaseId, userId, data),
    onSuccess: (_data: DatabaseUser, variables) => {
      queryClient.invalidateQueries({ queryKey: databaseKeys.users(variables.databaseId) });
    },
  });
}

export function useDeleteDatabaseUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ databaseId, userId }: { databaseId: string; userId: string }) =>
      databasesApi.deleteUser(databaseId, userId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: databaseKeys.users(variables.databaseId) });
      queryClient.invalidateQueries({ queryKey: databaseKeys.detail(variables.databaseId) });
    },
  });
}

// Backup/Restore Mutations
export function useBackupDatabase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, outputPath }: { id: string; outputPath: string }) =>
      databasesApi.backup(id, outputPath),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: databaseKeys.detail(variables.id) });
    },
  });
}

export function useRestoreDatabase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, inputPath }: { id: string; inputPath: string }) =>
      databasesApi.restore(id, inputPath),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: databaseKeys.detail(variables.id) });
    },
  });
}

export function useImportSQL() {
  return useMutation({
    mutationFn: ({ id, sql }: { id: string; sql: string }) => databasesApi.importSQL(id, sql),
  });
}

export function useExportTable() {
  return useMutation({
    mutationFn: ({ id, table, format }: { id: string; table: string; format?: 'sql' | 'csv' }) =>
      databasesApi.exportTable(id, table, format),
  });
}
