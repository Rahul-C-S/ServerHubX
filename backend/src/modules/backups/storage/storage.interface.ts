export interface StorageConfig {
  // Local
  localPath?: string;
  // S3
  s3Bucket?: string;
  s3Region?: string;
  s3AccessKey?: string;
  s3SecretKey?: string;
  s3Endpoint?: string;
  // SFTP
  sftpHost?: string;
  sftpPort?: number;
  sftpUsername?: string;
  sftpPassword?: string;
  sftpPrivateKey?: string;
  sftpPath?: string;
}

export interface StorageFile {
  name: string;
  path: string;
  size: number;
  lastModified: Date;
}

export interface StorageAdapter {
  upload(localPath: string, remotePath: string): Promise<string>;
  download(remotePath: string, localPath: string): Promise<void>;
  delete(remotePath: string): Promise<void>;
  list(path?: string): Promise<StorageFile[]>;
  exists(remotePath: string): Promise<boolean>;
  getSize(remotePath: string): Promise<number>;
}
