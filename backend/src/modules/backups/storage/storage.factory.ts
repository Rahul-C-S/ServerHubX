import { Injectable } from '@nestjs/common';
import { StorageType } from '../entities/backup.entity';
import type { StorageAdapter, StorageConfig } from './storage.interface';
import { LocalStorage } from './local.storage';
import { S3Storage } from './s3.storage';
import { SftpStorage } from './sftp.storage';

@Injectable()
export class StorageFactory {
  create(type: StorageType, config: StorageConfig): StorageAdapter {
    switch (type) {
      case StorageType.LOCAL:
        return new LocalStorage(config);
      case StorageType.S3:
        return new S3Storage(config);
      case StorageType.SFTP:
        return new SftpStorage(config);
      default:
        throw new Error(`Unknown storage type: ${type}`);
    }
  }
}
