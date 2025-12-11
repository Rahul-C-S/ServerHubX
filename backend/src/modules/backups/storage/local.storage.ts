import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { StorageAdapter, StorageConfig, StorageFile } from './storage.interface';

@Injectable()
export class LocalStorage implements StorageAdapter {
  private basePath: string;

  constructor(config: StorageConfig) {
    this.basePath = config.localPath || '/var/backups/serverhubx';
  }

  async upload(localPath: string, remotePath: string): Promise<string> {
    const fullPath = path.join(this.basePath, remotePath);
    const dir = path.dirname(fullPath);

    await fs.mkdir(dir, { recursive: true });
    await fs.copyFile(localPath, fullPath);

    return fullPath;
  }

  async download(remotePath: string, localPath: string): Promise<void> {
    const fullPath = path.join(this.basePath, remotePath);
    const dir = path.dirname(localPath);

    await fs.mkdir(dir, { recursive: true });
    await fs.copyFile(fullPath, localPath);
  }

  async delete(remotePath: string): Promise<void> {
    const fullPath = path.join(this.basePath, remotePath);
    await fs.unlink(fullPath);
  }

  async list(dirPath = ''): Promise<StorageFile[]> {
    const fullPath = path.join(this.basePath, dirPath);

    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      const files: StorageFile[] = [];

      for (const entry of entries) {
        if (entry.isFile()) {
          const filePath = path.join(fullPath, entry.name);
          const stats = await fs.stat(filePath);
          files.push({
            name: entry.name,
            path: path.join(dirPath, entry.name),
            size: stats.size,
            lastModified: stats.mtime,
          });
        }
      }

      return files;
    } catch {
      return [];
    }
  }

  async exists(remotePath: string): Promise<boolean> {
    const fullPath = path.join(this.basePath, remotePath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async getSize(remotePath: string): Promise<number> {
    const fullPath = path.join(this.basePath, remotePath);
    const stats = await fs.stat(fullPath);
    return stats.size;
  }
}
