import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SystemUser, SystemUserStatus } from '../system-users/entities/system-user.entity.js';
import { Domain } from '../domains/entities/domain.entity.js';
import { User, UserRole } from '../users/entities/user.entity.js';
import { CommandExecutorService } from '../../core/executor/command-executor.service.js';

export interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'symlink';
  size: number;
  permissions: string;
  owner: string;
  group: string;
  modified: Date;
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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB max for read/write
const BLOCKED_EXTENSIONS = ['.php', '.sh', '.bash', '.cgi', '.pl'];

@Injectable()
export class FileManagerService {
  private readonly logger = new Logger(FileManagerService.name);

  constructor(
    @InjectRepository(SystemUser)
    private readonly systemUserRepository: Repository<SystemUser>,
    @InjectRepository(Domain)
    private readonly domainRepository: Repository<Domain>,
    private readonly commandExecutor: CommandExecutorService,
  ) {}

  async getAccessInfo(user: User, targetUsername?: string): Promise<FileAccessInfo> {
    // Root admins can access any user's files
    if (user.role === UserRole.ROOT_ADMIN) {
      if (targetUsername) {
        const systemUser = await this.systemUserRepository.findOne({
          where: { username: targetUsername },
        });
        if (!systemUser) {
          return {
            basePath: '',
            canAccess: false,
            reason: 'System user not found',
            username: targetUsername,
          };
        }
        return {
          basePath: systemUser.homeDirectory,
          canAccess: true,
          username: systemUser.username,
        };
      }
      return {
        basePath: '/root',
        canAccess: true,
        username: 'root',
      };
    }

    // Resellers can access their own users' files
    if (user.role === UserRole.RESELLER) {
      if (targetUsername) {
        const systemUser = await this.systemUserRepository.findOne({
          where: { username: targetUsername, ownerId: user.id },
        });
        if (!systemUser) {
          return {
            basePath: '',
            canAccess: false,
            reason: 'You do not have access to this user',
            username: targetUsername,
          };
        }
        return {
          basePath: systemUser.homeDirectory,
          canAccess: true,
          username: systemUser.username,
        };
      }
      // Default to own system user
      const ownSystemUser = await this.systemUserRepository.findOne({
        where: { ownerId: user.id },
      });
      if (ownSystemUser) {
        return {
          basePath: ownSystemUser.homeDirectory,
          canAccess: true,
          username: ownSystemUser.username,
        };
      }
    }

    // Domain owners and developers can only access their own files
    if (user.role === UserRole.DOMAIN_OWNER || user.role === UserRole.DEVELOPER) {
      const systemUser = await this.systemUserRepository.findOne({
        where: { ownerId: user.id },
      });

      if (!systemUser) {
        // Check if they have a domain with a system user
        const domain = await this.domainRepository.findOne({
          where: { ownerId: user.id },
          relations: ['systemUser'],
        });
        if (domain?.systemUser) {
          return {
            basePath: domain.systemUser.homeDirectory,
            canAccess: true,
            username: domain.systemUser.username,
          };
        }
        return {
          basePath: '',
          canAccess: false,
          reason: 'No system user associated with your account',
          username: '',
        };
      }

      if (systemUser.status !== SystemUserStatus.ACTIVE) {
        return {
          basePath: systemUser.homeDirectory,
          canAccess: false,
          reason: 'Your account is suspended',
          username: systemUser.username,
        };
      }

      return {
        basePath: systemUser.homeDirectory,
        canAccess: true,
        username: systemUser.username,
      };
    }

    return {
      basePath: '',
      canAccess: false,
      reason: 'Insufficient permissions',
      username: '',
    };
  }

  private validatePath(requestedPath: string, basePath: string): string {
    // Normalize and resolve the path
    const normalizedPath = path.normalize(requestedPath);
    const resolvedPath = path.resolve(basePath, normalizedPath);

    // Ensure the resolved path starts with the base path
    if (!resolvedPath.startsWith(basePath)) {
      throw new ForbiddenException('Path traversal detected');
    }

    return resolvedPath;
  }

  async listDirectory(
    user: User,
    relativePath: string,
    targetUsername?: string,
    showHidden = false,
  ): Promise<FileInfo[]> {
    const accessInfo = await this.getAccessInfo(user, targetUsername);
    if (!accessInfo.canAccess) {
      throw new ForbiddenException(accessInfo.reason || 'Access denied');
    }

    const fullPath = this.validatePath(relativePath || '.', accessInfo.basePath);

    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      const files: FileInfo[] = [];

      for (const entry of entries) {
        if (!showHidden && entry.name.startsWith('.')) {
          continue;
        }

        try {
          const entryPath = path.join(fullPath, entry.name);
          const stats = await fs.stat(entryPath);

          // Get file permissions and ownership using ls -la
          const lsResult = await this.commandExecutor.execute('ls', ['-la', entryPath]);
          let permissions = '---------';
          let owner = 'unknown';
          let group = 'unknown';

          if (lsResult.success) {
            const parts = lsResult.stdout.trim().split(/\s+/);
            if (parts.length >= 4) {
              permissions = parts[0];
              owner = parts[2];
              group = parts[3];
            }
          }

          let type: 'file' | 'directory' | 'symlink' = 'file';
          if (entry.isDirectory()) {
            type = 'directory';
          } else if (entry.isSymbolicLink()) {
            type = 'symlink';
          }

          files.push({
            name: entry.name,
            path: path.relative(accessInfo.basePath, entryPath),
            type,
            size: stats.size,
            permissions,
            owner,
            group,
            modified: stats.mtime,
            isHidden: entry.name.startsWith('.'),
          });
        } catch (err) {
          // Skip files we can't stat
          this.logger.warn(`Could not stat ${entry.name}: ${(err as Error).message}`);
        }
      }

      // Sort: directories first, then by name
      files.sort((a, b) => {
        if (a.type === 'directory' && b.type !== 'directory') return -1;
        if (a.type !== 'directory' && b.type === 'directory') return 1;
        return a.name.localeCompare(b.name);
      });

      return files;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new NotFoundException('Directory not found');
      }
      throw error;
    }
  }

  async readFile(
    user: User,
    relativePath: string,
    targetUsername?: string,
  ): Promise<FileContent> {
    const accessInfo = await this.getAccessInfo(user, targetUsername);
    if (!accessInfo.canAccess) {
      throw new ForbiddenException(accessInfo.reason || 'Access denied');
    }

    const fullPath = this.validatePath(relativePath, accessInfo.basePath);

    try {
      const stats = await fs.stat(fullPath);

      if (stats.isDirectory()) {
        throw new BadRequestException('Cannot read a directory');
      }

      if (stats.size > MAX_FILE_SIZE) {
        throw new BadRequestException(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      }

      const content = await fs.readFile(fullPath, 'utf-8');
      const mimeType = this.getMimeType(fullPath);

      return {
        content,
        encoding: 'utf-8',
        size: stats.size,
        mimeType,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new NotFoundException('File not found');
      }
      throw error;
    }
  }

  async writeFile(
    user: User,
    relativePath: string,
    content: string,
    targetUsername?: string,
  ): Promise<void> {
    const accessInfo = await this.getAccessInfo(user, targetUsername);
    if (!accessInfo.canAccess) {
      throw new ForbiddenException(accessInfo.reason || 'Access denied');
    }

    const fullPath = this.validatePath(relativePath, accessInfo.basePath);

    // Check content size
    if (Buffer.byteLength(content, 'utf-8') > MAX_FILE_SIZE) {
      throw new BadRequestException(`Content too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Security check for dangerous extensions
    const ext = path.extname(fullPath).toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext) && user.role !== UserRole.ROOT_ADMIN) {
      throw new ForbiddenException(`Cannot write files with extension ${ext}`);
    }

    try {
      // Write as the system user
      await this.commandExecutor.execute('tee', [fullPath], {
        stdin: content,
        runAs: accessInfo.username,
      });

      this.logger.log(`File written: ${fullPath} by ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to write file ${fullPath}: ${(error as Error).message}`);
      throw new BadRequestException('Failed to write file');
    }
  }

  async createDirectory(
    user: User,
    relativePath: string,
    targetUsername?: string,
  ): Promise<void> {
    const accessInfo = await this.getAccessInfo(user, targetUsername);
    if (!accessInfo.canAccess) {
      throw new ForbiddenException(accessInfo.reason || 'Access denied');
    }

    const fullPath = this.validatePath(relativePath, accessInfo.basePath);

    const result = await this.commandExecutor.execute('mkdir', ['-p', fullPath], {
      runAs: accessInfo.username,
    });

    if (!result.success) {
      throw new BadRequestException(`Failed to create directory: ${result.stderr}`);
    }

    this.logger.log(`Directory created: ${fullPath} by ${user.email}`);
  }

  async createFile(
    user: User,
    relativePath: string,
    content = '',
    targetUsername?: string,
  ): Promise<void> {
    const accessInfo = await this.getAccessInfo(user, targetUsername);
    if (!accessInfo.canAccess) {
      throw new ForbiddenException(accessInfo.reason || 'Access denied');
    }

    const fullPath = this.validatePath(relativePath, accessInfo.basePath);

    // Check if file already exists
    try {
      await fs.access(fullPath);
      throw new BadRequestException('File already exists');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    // Security check for dangerous extensions
    const ext = path.extname(fullPath).toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext) && user.role !== UserRole.ROOT_ADMIN) {
      throw new ForbiddenException(`Cannot create files with extension ${ext}`);
    }

    // Ensure parent directory exists
    const parentDir = path.dirname(fullPath);
    await this.commandExecutor.execute('mkdir', ['-p', parentDir], {
      runAs: accessInfo.username,
    });

    // Create the file
    const result = await this.commandExecutor.execute('touch', [fullPath], {
      runAs: accessInfo.username,
    });

    if (!result.success) {
      throw new BadRequestException(`Failed to create file: ${result.stderr}`);
    }

    // Write content if provided
    if (content) {
      await this.commandExecutor.execute('tee', [fullPath], {
        stdin: content,
        runAs: accessInfo.username,
      });
    }

    this.logger.log(`File created: ${fullPath} by ${user.email}`);
  }

  async deleteFile(
    user: User,
    relativePath: string,
    targetUsername?: string,
  ): Promise<void> {
    const accessInfo = await this.getAccessInfo(user, targetUsername);
    if (!accessInfo.canAccess) {
      throw new ForbiddenException(accessInfo.reason || 'Access denied');
    }

    const fullPath = this.validatePath(relativePath, accessInfo.basePath);

    // Don't allow deleting the base path itself
    if (fullPath === accessInfo.basePath) {
      throw new ForbiddenException('Cannot delete the home directory');
    }

    try {
      const stats = await fs.stat(fullPath);
      if (stats.isDirectory()) {
        throw new BadRequestException('Use deleteDirectory for directories');
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new NotFoundException('File not found');
      }
      throw error;
    }

    const result = await this.commandExecutor.execute('rm', ['-f', fullPath], {
      runAs: accessInfo.username,
    });

    if (!result.success) {
      throw new BadRequestException(`Failed to delete file: ${result.stderr}`);
    }

    this.logger.log(`File deleted: ${fullPath} by ${user.email}`);
  }

  async deleteDirectory(
    user: User,
    relativePath: string,
    recursive = false,
    targetUsername?: string,
  ): Promise<void> {
    const accessInfo = await this.getAccessInfo(user, targetUsername);
    if (!accessInfo.canAccess) {
      throw new ForbiddenException(accessInfo.reason || 'Access denied');
    }

    const fullPath = this.validatePath(relativePath, accessInfo.basePath);

    // Don't allow deleting the base path itself
    if (fullPath === accessInfo.basePath) {
      throw new ForbiddenException('Cannot delete the home directory');
    }

    // Don't allow deleting critical directories
    const criticalDirs = ['public_html', '.ssh', 'logs'];
    const dirName = path.basename(fullPath);
    if (criticalDirs.includes(dirName) && path.dirname(fullPath) === accessInfo.basePath) {
      throw new ForbiddenException(`Cannot delete the ${dirName} directory`);
    }

    try {
      const stats = await fs.stat(fullPath);
      if (!stats.isDirectory()) {
        throw new BadRequestException('Not a directory');
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new NotFoundException('Directory not found');
      }
      throw error;
    }

    const args = recursive ? ['-rf', fullPath] : ['-d', fullPath];
    const result = await this.commandExecutor.execute('rm', args, {
      runAs: accessInfo.username,
    });

    if (!result.success) {
      if (result.stderr.includes('Directory not empty')) {
        throw new BadRequestException('Directory is not empty. Use recursive delete to remove.');
      }
      throw new BadRequestException(`Failed to delete directory: ${result.stderr}`);
    }

    this.logger.log(`Directory deleted: ${fullPath} by ${user.email}`);
  }

  async moveFile(
    user: User,
    sourcePath: string,
    destPath: string,
    targetUsername?: string,
  ): Promise<void> {
    const accessInfo = await this.getAccessInfo(user, targetUsername);
    if (!accessInfo.canAccess) {
      throw new ForbiddenException(accessInfo.reason || 'Access denied');
    }

    const fullSourcePath = this.validatePath(sourcePath, accessInfo.basePath);
    const fullDestPath = this.validatePath(destPath, accessInfo.basePath);

    try {
      await fs.access(fullSourcePath);
    } catch {
      throw new NotFoundException('Source file not found');
    }

    const result = await this.commandExecutor.execute('mv', [fullSourcePath, fullDestPath], {
      runAs: accessInfo.username,
    });

    if (!result.success) {
      throw new BadRequestException(`Failed to move file: ${result.stderr}`);
    }

    this.logger.log(`File moved: ${fullSourcePath} -> ${fullDestPath} by ${user.email}`);
  }

  async copyFile(
    user: User,
    sourcePath: string,
    destPath: string,
    targetUsername?: string,
  ): Promise<void> {
    const accessInfo = await this.getAccessInfo(user, targetUsername);
    if (!accessInfo.canAccess) {
      throw new ForbiddenException(accessInfo.reason || 'Access denied');
    }

    const fullSourcePath = this.validatePath(sourcePath, accessInfo.basePath);
    const fullDestPath = this.validatePath(destPath, accessInfo.basePath);

    try {
      await fs.access(fullSourcePath);
    } catch {
      throw new NotFoundException('Source file not found');
    }

    const result = await this.commandExecutor.execute('cp', ['-r', fullSourcePath, fullDestPath], {
      runAs: accessInfo.username,
    });

    if (!result.success) {
      throw new BadRequestException(`Failed to copy file: ${result.stderr}`);
    }

    this.logger.log(`File copied: ${fullSourcePath} -> ${fullDestPath} by ${user.email}`);
  }

  async extractArchive(
    user: User,
    archivePath: string,
    destPath?: string,
    targetUsername?: string,
  ): Promise<void> {
    const accessInfo = await this.getAccessInfo(user, targetUsername);
    if (!accessInfo.canAccess) {
      throw new ForbiddenException(accessInfo.reason || 'Access denied');
    }

    const fullArchivePath = this.validatePath(archivePath, accessInfo.basePath);
    const fullDestPath = destPath
      ? this.validatePath(destPath, accessInfo.basePath)
      : path.dirname(fullArchivePath);

    try {
      await fs.access(fullArchivePath);
    } catch {
      throw new NotFoundException('Archive file not found');
    }

    const ext = path.extname(fullArchivePath).toLowerCase();
    let result;

    if (ext === '.zip') {
      result = await this.commandExecutor.execute('unzip', ['-o', fullArchivePath, '-d', fullDestPath], {
        runAs: accessInfo.username,
      });
    } else if (ext === '.tar' || fullArchivePath.endsWith('.tar.gz') || fullArchivePath.endsWith('.tgz')) {
      result = await this.commandExecutor.execute('tar', ['-xf', fullArchivePath, '-C', fullDestPath], {
        runAs: accessInfo.username,
      });
    } else if (ext === '.gz') {
      result = await this.commandExecutor.execute('gunzip', ['-k', fullArchivePath], {
        runAs: accessInfo.username,
      });
    } else {
      throw new BadRequestException('Unsupported archive format. Supported: .zip, .tar, .tar.gz, .tgz, .gz');
    }

    if (!result.success) {
      throw new BadRequestException(`Failed to extract archive: ${result.stderr}`);
    }

    this.logger.log(`Archive extracted: ${fullArchivePath} -> ${fullDestPath} by ${user.email}`);
  }

  async getPermissions(
    user: User,
    relativePath: string,
    targetUsername?: string,
  ): Promise<{ permissions: string; owner: string; group: string }> {
    const accessInfo = await this.getAccessInfo(user, targetUsername);
    if (!accessInfo.canAccess) {
      throw new ForbiddenException(accessInfo.reason || 'Access denied');
    }

    const fullPath = this.validatePath(relativePath, accessInfo.basePath);

    const result = await this.commandExecutor.execute('stat', ['-c', '%a %U %G', fullPath]);

    if (!result.success) {
      throw new NotFoundException('File not found');
    }

    const parts = result.stdout.trim().split(' ');
    return {
      permissions: parts[0] || '644',
      owner: parts[1] || 'unknown',
      group: parts[2] || 'unknown',
    };
  }

  async setPermissions(
    user: User,
    relativePath: string,
    permissions: string,
    targetUsername?: string,
  ): Promise<void> {
    const accessInfo = await this.getAccessInfo(user, targetUsername);
    if (!accessInfo.canAccess) {
      throw new ForbiddenException(accessInfo.reason || 'Access denied');
    }

    // Validate permissions format (octal)
    if (!/^[0-7]{3,4}$/.test(permissions)) {
      throw new BadRequestException('Invalid permissions format. Use octal format (e.g., 755)');
    }

    const fullPath = this.validatePath(relativePath, accessInfo.basePath);

    const result = await this.commandExecutor.execute('chmod', [permissions, fullPath], {
      runAs: accessInfo.username,
    });

    if (!result.success) {
      throw new BadRequestException(`Failed to set permissions: ${result.stderr}`);
    }

    this.logger.log(`Permissions changed: ${fullPath} to ${permissions} by ${user.email}`);
  }

  async setOwnership(
    user: User,
    relativePath: string,
    owner: string,
    group?: string,
    targetUsername?: string,
  ): Promise<void> {
    // Only root admins can change ownership
    if (user.role !== UserRole.ROOT_ADMIN) {
      throw new ForbiddenException('Only administrators can change file ownership');
    }

    const accessInfo = await this.getAccessInfo(user, targetUsername);
    if (!accessInfo.canAccess) {
      throw new ForbiddenException(accessInfo.reason || 'Access denied');
    }

    const fullPath = this.validatePath(relativePath, accessInfo.basePath);
    const ownerGroup = group ? `${owner}:${group}` : owner;

    const result = await this.commandExecutor.execute('chown', [ownerGroup, fullPath]);

    if (!result.success) {
      throw new BadRequestException(`Failed to set ownership: ${result.stderr}`);
    }

    this.logger.log(`Ownership changed: ${fullPath} to ${ownerGroup} by ${user.email}`);
  }

  async uploadFile(
    user: User,
    relativePath: string,
    fileBuffer: Buffer,
    filename: string,
    targetUsername?: string,
  ): Promise<void> {
    const accessInfo = await this.getAccessInfo(user, targetUsername);
    if (!accessInfo.canAccess) {
      throw new ForbiddenException(accessInfo.reason || 'Access denied');
    }

    const targetDir = this.validatePath(relativePath || '.', accessInfo.basePath);
    const fullPath = path.join(targetDir, filename);

    // Check file size
    if (fileBuffer.length > MAX_FILE_SIZE * 10) { // 100MB for uploads
      throw new BadRequestException('File too large');
    }

    // Security check for dangerous extensions
    const ext = path.extname(filename).toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext) && user.role !== UserRole.ROOT_ADMIN) {
      throw new ForbiddenException(`Cannot upload files with extension ${ext}`);
    }

    // Write the file using base64 encoding via command
    const base64Content = fileBuffer.toString('base64');
    const result = await this.commandExecutor.execute(
      'base64',
      ['-d', '-o', fullPath],
      {
        stdin: base64Content,
        runAs: accessInfo.username,
      },
    );

    if (!result.success) {
      // Fallback: write directly via tee
      const tempPath = `/tmp/upload_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      await fs.writeFile(tempPath, fileBuffer);

      const mvResult = await this.commandExecutor.execute('mv', [tempPath, fullPath]);
      if (mvResult.success) {
        await this.commandExecutor.execute('chown', [`${accessInfo.username}:${accessInfo.username}`, fullPath]);
      } else {
        await fs.unlink(tempPath).catch(() => {});
        throw new BadRequestException('Failed to upload file');
      }
    }

    this.logger.log(`File uploaded: ${fullPath} by ${user.email}`);
  }

  async getDownloadPath(
    user: User,
    relativePath: string,
    targetUsername?: string,
  ): Promise<string> {
    const accessInfo = await this.getAccessInfo(user, targetUsername);
    if (!accessInfo.canAccess) {
      throw new ForbiddenException(accessInfo.reason || 'Access denied');
    }

    const fullPath = this.validatePath(relativePath, accessInfo.basePath);

    try {
      const stats = await fs.stat(fullPath);
      if (stats.isDirectory()) {
        throw new BadRequestException('Cannot download a directory');
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new NotFoundException('File not found');
      }
      throw error;
    }

    return fullPath;
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html',
      '.htm': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.php': 'text/x-php',
      '.py': 'text/x-python',
      '.rb': 'text/x-ruby',
      '.java': 'text/x-java-source',
      '.ts': 'text/typescript',
      '.tsx': 'text/typescript',
      '.jsx': 'text/javascript',
      '.yml': 'text/yaml',
      '.yaml': 'text/yaml',
      '.sh': 'application/x-sh',
      '.sql': 'application/sql',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.ico': 'image/x-icon',
      '.pdf': 'application/pdf',
      '.zip': 'application/zip',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}
