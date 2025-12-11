export type FileType = 'file' | 'directory' | 'symlink';

export interface FileInfo {
  name: string;
  path: string;
  type: FileType;
  size: number;
  permissions: string;
  owner: string;
  group: string;
  modified: string;
  isHidden: boolean;
}

export interface FileContent {
  content: string;
  encoding: string;
  size: number;
  mimeType: string;
}

export interface FileAccessInfo {
  basePath: string;
  canAccess: boolean;
  reason?: string;
  username: string;
}

export interface ListDirectoryParams {
  path?: string;
  targetUsername?: string;
  showHidden?: boolean;
}

export interface ReadFileParams {
  path: string;
  targetUsername?: string;
}

export interface WriteFileParams {
  path: string;
  content: string;
  targetUsername?: string;
}

export interface CreateFileParams {
  path: string;
  content?: string;
  targetUsername?: string;
}

export interface CreateDirectoryParams {
  path: string;
  targetUsername?: string;
}

export interface DeleteParams {
  path: string;
  targetUsername?: string;
  recursive?: boolean;
}

export interface MoveParams {
  sourcePath: string;
  destPath: string;
  targetUsername?: string;
}

export interface CopyParams {
  sourcePath: string;
  destPath: string;
  targetUsername?: string;
}

export interface ExtractParams {
  archivePath: string;
  destPath?: string;
  targetUsername?: string;
}

export interface SetPermissionsParams {
  path: string;
  permissions: string;
  targetUsername?: string;
}

export interface SetOwnershipParams {
  path: string;
  owner: string;
  group?: string;
  targetUsername?: string;
}

export interface FilePermissions {
  permissions: string;
  owner: string;
  group: string;
}
