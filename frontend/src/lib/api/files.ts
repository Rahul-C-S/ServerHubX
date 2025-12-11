import { apiClient } from './client';
import type {
  FileInfo,
  FileContent,
  FileAccessInfo,
  FilePermissions,
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

export async function listDirectory(
  params: ListDirectoryParams
): Promise<{ files: FileInfo[]; path: string }> {
  const response = await apiClient.get<{ files: FileInfo[]; path: string }>('/files', { params });
  return response.data;
}

export async function readFile(
  path: string,
  targetUsername?: string
): Promise<FileContent> {
  const response = await apiClient.get<FileContent>('/files/content', {
    params: { path, targetUsername },
  });
  return response.data;
}

export async function writeFile(params: WriteFileParams): Promise<void> {
  await apiClient.put('/files/content', params);
}

export async function createFile(params: CreateFileParams): Promise<void> {
  await apiClient.post('/files/create', params);
}

export async function createDirectory(params: CreateDirectoryParams): Promise<void> {
  await apiClient.post('/files/directory', params);
}

export async function deleteFile(path: string, targetUsername?: string): Promise<void> {
  await apiClient.delete('/files', {
    params: { path, targetUsername },
  });
}

export async function deleteDirectory(
  path: string,
  recursive?: boolean,
  targetUsername?: string
): Promise<void> {
  await apiClient.delete('/files/directory', {
    params: { path, recursive, targetUsername },
  });
}

export async function moveFile(params: MoveParams): Promise<void> {
  await apiClient.post('/files/move', params);
}

export async function copyFile(params: CopyParams): Promise<void> {
  await apiClient.post('/files/copy', params);
}

export async function extractArchive(params: ExtractParams): Promise<void> {
  await apiClient.post('/files/extract', params);
}

export async function getPermissions(
  path: string,
  targetUsername?: string
): Promise<FilePermissions> {
  const response = await apiClient.get<FilePermissions>('/files/permissions', {
    params: { path, targetUsername },
  });
  return response.data;
}

export async function setPermissions(params: SetPermissionsParams): Promise<void> {
  await apiClient.patch('/files/permissions', params);
}

export async function setOwnership(params: SetOwnershipParams): Promise<void> {
  await apiClient.patch('/files/ownership', params);
}

export async function uploadFile(
  file: File,
  path?: string,
  targetUsername?: string
): Promise<{ filename: string }> {
  const formData = new FormData();
  formData.append('file', file);
  if (path) formData.append('path', path);
  if (targetUsername) formData.append('targetUsername', targetUsername);

  const response = await apiClient.post<{ success: boolean; filename: string }>(
    '/files/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return { filename: response.data.filename };
}

export function getDownloadUrl(path: string, targetUsername?: string): string {
  const baseUrl = apiClient.defaults.baseURL || '';
  const params = new URLSearchParams({ path });
  if (targetUsername) params.append('targetUsername', targetUsername);
  return `${baseUrl}/files/download?${params.toString()}`;
}

export async function getAccessInfo(targetUsername?: string): Promise<FileAccessInfo> {
  const response = await apiClient.get<FileAccessInfo>('/files/access', {
    params: { targetUsername },
  });
  return response.data;
}
