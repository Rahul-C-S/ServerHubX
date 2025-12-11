import { Injectable } from '@nestjs/common';
import Client from 'ssh2-sftp-client';
import type { StorageAdapter, StorageConfig, StorageFile } from './storage.interface';

@Injectable()
export class SftpStorage implements StorageAdapter {
  private config: StorageConfig;
  private basePath: string;

  constructor(config: StorageConfig) {
    this.config = config;
    this.basePath = config.sftpPath || '/backups';
  }

  private async getClient(): Promise<Client> {
    const client = new Client();

    const connectConfig: Client.ConnectOptions = {
      host: this.config.sftpHost,
      port: this.config.sftpPort || 22,
      username: this.config.sftpUsername,
    };

    if (this.config.sftpPrivateKey) {
      connectConfig.privateKey = this.config.sftpPrivateKey;
    } else if (this.config.sftpPassword) {
      connectConfig.password = this.config.sftpPassword;
    }

    await client.connect(connectConfig);
    return client;
  }

  async upload(localPath: string, remotePath: string): Promise<string> {
    const client = await this.getClient();
    try {
      const fullPath = `${this.basePath}/${remotePath}`;
      const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));

      await client.mkdir(dir, true);
      await client.put(localPath, fullPath);

      return fullPath;
    } finally {
      await client.end();
    }
  }

  async download(remotePath: string, localPath: string): Promise<void> {
    const client = await this.getClient();
    try {
      const fullPath = `${this.basePath}/${remotePath}`;
      await client.get(fullPath, localPath);
    } finally {
      await client.end();
    }
  }

  async delete(remotePath: string): Promise<void> {
    const client = await this.getClient();
    try {
      const fullPath = `${this.basePath}/${remotePath}`;
      await client.delete(fullPath);
    } finally {
      await client.end();
    }
  }

  async list(dirPath = ''): Promise<StorageFile[]> {
    const client = await this.getClient();
    try {
      const fullPath = `${this.basePath}/${dirPath}`;
      const listing = await client.list(fullPath);

      return listing
        .filter((item) => item.type === '-')
        .map((item) => ({
          name: item.name,
          path: dirPath ? `${dirPath}/${item.name}` : item.name,
          size: item.size,
          lastModified: new Date(item.modifyTime),
        }));
    } catch {
      return [];
    } finally {
      await client.end();
    }
  }

  async exists(remotePath: string): Promise<boolean> {
    const client = await this.getClient();
    try {
      const fullPath = `${this.basePath}/${remotePath}`;
      return await client.exists(fullPath) !== false;
    } finally {
      await client.end();
    }
  }

  async getSize(remotePath: string): Promise<number> {
    const client = await this.getClient();
    try {
      const fullPath = `${this.basePath}/${remotePath}`;
      const stat = await client.stat(fullPath);
      return stat.size;
    } finally {
      await client.end();
    }
  }
}
