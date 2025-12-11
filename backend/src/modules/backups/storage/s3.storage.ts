import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import * as fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import type { StorageAdapter, StorageConfig, StorageFile } from './storage.interface';

@Injectable()
export class S3Storage implements StorageAdapter {
  private client: S3Client;
  private bucket: string;

  constructor(config: StorageConfig) {
    this.bucket = config.s3Bucket || '';

    const clientConfig: {
      region: string;
      credentials?: { accessKeyId: string; secretAccessKey: string };
      endpoint?: string;
      forcePathStyle?: boolean;
    } = {
      region: config.s3Region || 'us-east-1',
    };

    if (config.s3AccessKey && config.s3SecretKey) {
      clientConfig.credentials = {
        accessKeyId: config.s3AccessKey,
        secretAccessKey: config.s3SecretKey,
      };
    }

    if (config.s3Endpoint) {
      clientConfig.endpoint = config.s3Endpoint;
      clientConfig.forcePathStyle = true;
    }

    this.client = new S3Client(clientConfig);
  }

  async upload(localPath: string, remotePath: string): Promise<string> {
    const fileStream = createReadStream(localPath);
    const stats = await fs.stat(localPath);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: remotePath,
      Body: fileStream,
      ContentLength: stats.size,
    });

    await this.client.send(command);

    return `s3://${this.bucket}/${remotePath}`;
  }

  async download(remotePath: string, localPath: string): Promise<void> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: remotePath,
    });

    const response = await this.client.send(command);

    if (response.Body instanceof Readable) {
      const writeStream = createWriteStream(localPath);
      await pipeline(response.Body, writeStream);
    }
  }

  async delete(remotePath: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: remotePath,
    });

    await this.client.send(command);
  }

  async list(prefix = ''): Promise<StorageFile[]> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
    });

    const response = await this.client.send(command);
    const files: StorageFile[] = [];

    if (response.Contents) {
      for (const obj of response.Contents) {
        if (obj.Key && obj.Size !== undefined && obj.LastModified) {
          files.push({
            name: obj.Key.split('/').pop() || obj.Key,
            path: obj.Key,
            size: obj.Size,
            lastModified: obj.LastModified,
          });
        }
      }
    }

    return files;
  }

  async exists(remotePath: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: remotePath,
      });
      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  async getSize(remotePath: string): Promise<number> {
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: remotePath,
    });

    const response = await this.client.send(command);
    return response.ContentLength || 0;
  }
}
