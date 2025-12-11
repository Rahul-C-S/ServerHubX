import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listDirectory,
  readFile,
  writeFile,
  createFile,
  createDirectory,
  deleteFile,
  deleteDirectory,
  moveFile,
  copyFile,
  extractArchive,
  getPermissions,
  setPermissions,
  setOwnership,
  uploadFile,
  getAccessInfo,
} from '@/lib/api/files';
import type {
  ListDirectoryParams,
  WriteFileParams,
  CreateFileParams,
  CreateDirectoryParams,
  MoveParams,
  CopyParams,
  ExtractParams,
  SetPermissionsParams,
  SetOwnershipParams,
} from '@/types';

const FILE_KEYS = {
  all: ['files'] as const,
  directory: (path: string, targetUsername?: string) =>
    [...FILE_KEYS.all, 'directory', path, targetUsername] as const,
  content: (path: string, targetUsername?: string) =>
    [...FILE_KEYS.all, 'content', path, targetUsername] as const,
  permissions: (path: string, targetUsername?: string) =>
    [...FILE_KEYS.all, 'permissions', path, targetUsername] as const,
  access: (targetUsername?: string) =>
    [...FILE_KEYS.all, 'access', targetUsername] as const,
};

export function useDirectory(params: ListDirectoryParams) {
  return useQuery({
    queryKey: FILE_KEYS.directory(params.path || '.', params.targetUsername),
    queryFn: () => listDirectory(params),
    staleTime: 5000,
  });
}

export function useFileContent(path: string, targetUsername?: string, enabled = true) {
  return useQuery({
    queryKey: FILE_KEYS.content(path, targetUsername),
    queryFn: () => readFile(path, targetUsername),
    enabled,
    staleTime: 10000,
  });
}

export function useFilePermissions(path: string, targetUsername?: string, enabled = true) {
  return useQuery({
    queryKey: FILE_KEYS.permissions(path, targetUsername),
    queryFn: () => getPermissions(path, targetUsername),
    enabled,
  });
}

export function useAccessInfo(targetUsername?: string) {
  return useQuery({
    queryKey: FILE_KEYS.access(targetUsername),
    queryFn: () => getAccessInfo(targetUsername),
  });
}

export function useWriteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: WriteFileParams) => writeFile(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: FILE_KEYS.content(variables.path, variables.targetUsername),
      });
    },
  });
}

export function useCreateFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateFileParams) => createFile(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FILE_KEYS.all });
    },
  });
}

export function useCreateDirectory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateDirectoryParams) => createDirectory(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FILE_KEYS.all });
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ path, targetUsername }: { path: string; targetUsername?: string }) =>
      deleteFile(path, targetUsername),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FILE_KEYS.all });
    },
  });
}

export function useDeleteDirectory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      path,
      recursive,
      targetUsername,
    }: {
      path: string;
      recursive?: boolean;
      targetUsername?: string;
    }) => deleteDirectory(path, recursive, targetUsername),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FILE_KEYS.all });
    },
  });
}

export function useMoveFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: MoveParams) => moveFile(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FILE_KEYS.all });
    },
  });
}

export function useCopyFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CopyParams) => copyFile(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FILE_KEYS.all });
    },
  });
}

export function useExtractArchive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: ExtractParams) => extractArchive(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FILE_KEYS.all });
    },
  });
}

export function useSetPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: SetPermissionsParams) => setPermissions(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: FILE_KEYS.permissions(variables.path, variables.targetUsername),
      });
      queryClient.invalidateQueries({ queryKey: FILE_KEYS.all });
    },
  });
}

export function useSetOwnership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: SetOwnershipParams) => setOwnership(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: FILE_KEYS.permissions(variables.path, variables.targetUsername),
      });
      queryClient.invalidateQueries({ queryKey: FILE_KEYS.all });
    },
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      file,
      path,
      targetUsername,
    }: {
      file: File;
      path?: string;
      targetUsername?: string;
    }) => uploadFile(file, path, targetUsername),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FILE_KEYS.all });
    },
  });
}
