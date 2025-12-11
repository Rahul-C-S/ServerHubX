import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { SystemUser, SystemUserStatus } from './entities/system-user.entity.js';
import { SSHKey, SSHKeyType } from './entities/ssh-key.entity.js';
import { CreateSystemUserDto } from './dto/create-system-user.dto.js';
import { UpdateSystemUserDto } from './dto/update-system-user.dto.js';
import { AddSSHKeyDto } from './dto/add-ssh-key.dto.js';
import { CommandExecutorService } from '../../core/executor/command-executor.service.js';
import { PathResolverService } from '../../core/distro/path-resolver.service.js';
import { TransactionManagerService } from '../../core/rollback/transaction-manager.service.js';
import { InputValidatorService } from '../../core/validators/input-validator.service.js';
import { AuditLoggerService, AuditContext } from '../../core/audit/audit-logger.service.js';
import { AuditOperationType, AuditResourceType } from '../../core/audit/entities/audit-log.entity.js';
import { LoggerService } from '../../common/logger/logger.service.js';

export interface SystemUserWithSSHKeys {
  id: string;
  username: string;
  uid: number;
  gid: number;
  homeDirectory: string;
  shell: string;
  status: SystemUserStatus;
  diskQuotaMb: number;
  diskUsedMb: number;
  inodeQuota: number;
  inodeUsed: number;
  sshEnabled: boolean;
  sftpOnly: boolean;
  ownerId?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  sshKeys?: SSHKey[];
}

@Injectable()
export class SystemUsersService {
  private readonly MIN_UID = 1000;
  private readonly MAX_UID = 60000;

  constructor(
    @InjectRepository(SystemUser)
    private readonly systemUserRepository: Repository<SystemUser>,
    @InjectRepository(SSHKey)
    private readonly sshKeyRepository: Repository<SSHKey>,
    private readonly commandExecutor: CommandExecutorService,
    private readonly pathResolver: PathResolverService,
    private readonly transactionManager: TransactionManagerService,
    private readonly inputValidator: InputValidatorService,
    private readonly auditLogger: AuditLoggerService,
    private readonly logger: LoggerService,
  ) {}

  async create(dto: CreateSystemUserDto, performedBy?: string): Promise<SystemUser> {
    // Validate username
    const usernameValidation = this.inputValidator.validateUsername(dto.username);
    if (!usernameValidation.isValid) {
      throw new BadRequestException(usernameValidation.error);
    }
    const username = usernameValidation.sanitized!;

    // Check if username already exists in database
    const existing = await this.systemUserRepository.findOne({ where: { username } });
    if (existing) {
      throw new ConflictException(`User "${username}" already exists`);
    }

    // Check if username exists on the system
    const checkResult = await this.commandExecutor.execute('id', [username]);
    if (checkResult.success) {
      throw new ConflictException(`System user "${username}" already exists on this server`);
    }

    const operationId = `create-system-user-${Date.now()}`;
    this.auditLogger.startOperation(operationId);
    const auditContext: AuditContext = { userId: performedBy };

    return this.transactionManager.withTransaction(async (transactionId) => {
      try {
        // Find next available UID
        const uid = await this.findNextAvailableUid();
        const gid = uid; // Create group with same ID

        const homeDirectory = this.pathResolver.getUserHomeDir(username);
        const shell = dto.shell || '/bin/bash';

        // Create the system user
        const createResult = await this.commandExecutor.execute('useradd', [
          '-m',
          '-d', homeDirectory,
          '-s', shell,
          '-u', String(uid),
          username,
        ]);

        if (!createResult.success) {
          throw new Error(`Failed to create system user: ${createResult.stderr}`);
        }

        // Add rollback action
        this.transactionManager.addRollbackAction(transactionId, async () => {
          await this.commandExecutor.execute('userdel', ['-r', '-f', username]);
        });

        // Set password if provided
        if (dto.password) {
          await this.setPasswordInternal(username, dto.password);
        }

        // Create directory structure
        await this.createDirectoryStructure(username, transactionId);

        // Set quota if provided
        if (dto.diskQuotaMb && dto.diskQuotaMb > 0) {
          await this.setQuotaInternal(username, dto.diskQuotaMb, dto.inodeQuota || 0);
        }

        // Update shell if SFTP only
        if (dto.sftpOnly) {
          await this.commandExecutor.execute('usermod', ['-s', '/usr/sbin/nologin', username]);
        }

        // Create database record
        const systemUser = this.systemUserRepository.create({
          username,
          uid,
          gid,
          homeDirectory,
          shell: dto.sftpOnly ? '/usr/sbin/nologin' : shell,
          status: SystemUserStatus.ACTIVE,
          diskQuotaMb: dto.diskQuotaMb || 0,
          inodeQuota: dto.inodeQuota || 0,
          sshEnabled: dto.sshEnabled ?? true,
          sftpOnly: dto.sftpOnly ?? false,
          ownerId: dto.ownerId,
        });

        const savedUser = await this.systemUserRepository.save(systemUser);

        await this.auditLogger.logOperationComplete(operationId, {
          operationType: AuditOperationType.CREATE,
          resourceType: AuditResourceType.USER,
          resourceId: savedUser.id,
          resourceName: username,
          description: `Created system user ${username} (UID: ${uid})`,
        }, auditContext);
        this.logger.log(`Created system user: ${username} (UID: ${uid})`, 'SystemUsersService');

        return savedUser;
      } catch (error) {
        await this.auditLogger.logOperationFailed(operationId, {
          operationType: AuditOperationType.CREATE,
          resourceType: AuditResourceType.USER,
          resourceName: username,
          description: `Failed to create system user ${username}`,
        }, error instanceof Error ? error : new Error(String(error)), auditContext);
        throw error;
      }
    });
  }

  async findAll(ownerId?: string): Promise<SystemUser[]> {
    const queryBuilder = this.systemUserRepository.createQueryBuilder('systemUser');

    if (ownerId) {
      queryBuilder.where('systemUser.ownerId = :ownerId', { ownerId });
    }

    return queryBuilder.orderBy('systemUser.createdAt', 'DESC').getMany();
  }

  async findOne(id: string): Promise<SystemUserWithSSHKeys> {
    const systemUser = await this.systemUserRepository.findOne({ where: { id } });
    if (!systemUser) {
      throw new NotFoundException(`System user not found`);
    }

    const sshKeys = await this.sshKeyRepository.find({
      where: { systemUserId: id },
      order: { createdAt: 'DESC' },
    });

    return { ...systemUser, sshKeys };
  }

  async findByUsername(username: string): Promise<SystemUser | null> {
    return this.systemUserRepository.findOne({ where: { username } });
  }

  async update(id: string, dto: UpdateSystemUserDto, performedBy?: string): Promise<SystemUser> {
    const systemUser = await this.systemUserRepository.findOne({ where: { id } });
    if (!systemUser) {
      throw new NotFoundException(`System user not found`);
    }

    const operationId = `update-system-user-${Date.now()}`;
    this.auditLogger.startOperation(operationId);
    const auditContext: AuditContext = { userId: performedBy };

    try {
      // Update password if provided
      if (dto.password) {
        await this.setPasswordInternal(systemUser.username, dto.password);
      }

      // Update shell if provided
      if (dto.shell && dto.shell !== systemUser.shell) {
        await this.commandExecutor.execute('usermod', ['-s', dto.shell, systemUser.username]);
        systemUser.shell = dto.shell;
      }

      // Handle SFTP only mode
      if (dto.sftpOnly !== undefined && dto.sftpOnly !== systemUser.sftpOnly) {
        const newShell = dto.sftpOnly ? '/usr/sbin/nologin' : '/bin/bash';
        await this.commandExecutor.execute('usermod', ['-s', newShell, systemUser.username]);
        systemUser.sftpOnly = dto.sftpOnly;
        systemUser.shell = newShell;
      }

      // Update quota if provided
      if (dto.diskQuotaMb !== undefined || dto.inodeQuota !== undefined) {
        const diskQuota = dto.diskQuotaMb ?? systemUser.diskQuotaMb;
        const inodeQuota = dto.inodeQuota ?? systemUser.inodeQuota;
        await this.setQuotaInternal(systemUser.username, diskQuota, inodeQuota);
        systemUser.diskQuotaMb = diskQuota;
        systemUser.inodeQuota = inodeQuota;
      }

      // Update status if provided
      if (dto.status !== undefined && dto.status !== systemUser.status) {
        if (dto.status === SystemUserStatus.SUSPENDED) {
          await this.suspendUserInternal(systemUser.username);
        } else if (dto.status === SystemUserStatus.ACTIVE && systemUser.status === SystemUserStatus.SUSPENDED) {
          await this.unsuspendUserInternal(systemUser.username);
        }
        systemUser.status = dto.status;
      }

      // Update SSH enabled if provided
      if (dto.sshEnabled !== undefined) {
        systemUser.sshEnabled = dto.sshEnabled;
        if (!dto.sshEnabled) {
          // Remove SSH access by clearing authorized_keys
          const sshPath = this.pathResolver.getSshAuthorizedKeysPath(systemUser.username);
          await this.commandExecutor.execute('rm', ['-f', sshPath]);
        }
      }

      const updatedUser = await this.systemUserRepository.save(systemUser);
      await this.auditLogger.logOperationComplete(operationId, {
        operationType: AuditOperationType.UPDATE,
        resourceType: AuditResourceType.USER,
        resourceId: id,
        resourceName: systemUser.username,
        description: `Updated system user ${systemUser.username}`,
        newValue: dto as Record<string, unknown>,
      }, auditContext);

      return updatedUser;
    } catch (error) {
      await this.auditLogger.logOperationFailed(operationId, {
        operationType: AuditOperationType.UPDATE,
        resourceType: AuditResourceType.USER,
        resourceId: id,
        resourceName: systemUser.username,
        description: `Failed to update system user ${systemUser.username}`,
      }, error instanceof Error ? error : new Error(String(error)), auditContext);
      throw error;
    }
  }

  async delete(id: string, performedBy?: string): Promise<void> {
    const systemUser = await this.systemUserRepository.findOne({ where: { id } });
    if (!systemUser) {
      throw new NotFoundException(`System user not found`);
    }

    const operationId = `delete-system-user-${Date.now()}`;
    this.auditLogger.startOperation(operationId);
    const auditContext: AuditContext = { userId: performedBy };

    try {
      // Delete the system user and home directory
      const result = await this.commandExecutor.execute('userdel', ['-r', '-f', systemUser.username]);
      if (!result.success && !result.stderr.includes('does not exist')) {
        throw new Error(`Failed to delete system user: ${result.stderr}`);
      }

      // Delete SSH keys from database
      await this.sshKeyRepository.delete({ systemUserId: id });

      // Soft delete from database
      await this.systemUserRepository.softDelete(id);

      await this.auditLogger.logOperationComplete(operationId, {
        operationType: AuditOperationType.DELETE,
        resourceType: AuditResourceType.USER,
        resourceId: id,
        resourceName: systemUser.username,
        description: `Deleted system user ${systemUser.username}`,
      }, auditContext);
      this.logger.log(`Deleted system user: ${systemUser.username}`, 'SystemUsersService');
    } catch (error) {
      await this.auditLogger.logOperationFailed(operationId, {
        operationType: AuditOperationType.DELETE,
        resourceType: AuditResourceType.USER,
        resourceId: id,
        resourceName: systemUser.username,
        description: `Failed to delete system user ${systemUser.username}`,
      }, error instanceof Error ? error : new Error(String(error)), auditContext);
      throw error;
    }
  }

  async setPassword(id: string, password: string, performedBy?: string): Promise<void> {
    const systemUser = await this.systemUserRepository.findOne({ where: { id } });
    if (!systemUser) {
      throw new NotFoundException(`System user not found`);
    }

    await this.auditLogger.logSecurityEvent(
      AuditOperationType.PASSWORD_RESET,
      `Password changed for system user ${systemUser.username}`,
      { userId: performedBy },
      { systemUserId: id },
    );

    await this.setPasswordInternal(systemUser.username, password);
  }

  async getQuotaUsage(id: string): Promise<{ diskUsedMb: number; inodeUsed: number }> {
    const systemUser = await this.systemUserRepository.findOne({ where: { id } });
    if (!systemUser) {
      throw new NotFoundException(`System user not found`);
    }

    // Get disk usage using du
    const duResult = await this.commandExecutor.execute('du', [
      '-sm',
      systemUser.homeDirectory,
    ]);

    let diskUsedMb = 0;
    if (duResult.success) {
      const match = duResult.stdout.match(/^(\d+)/);
      if (match) {
        diskUsedMb = parseInt(match[1], 10);
      }
    }

    // Get inode usage - count files
    const findResult = await this.commandExecutor.execute('find', [
      systemUser.homeDirectory,
      '-type', 'f',
    ]);

    let inodeUsed = 0;
    if (findResult.success) {
      inodeUsed = findResult.stdout.split('\n').filter((line) => line.trim()).length;
    }

    // Update database
    await this.systemUserRepository.update(id, { diskUsedMb, inodeUsed });

    return { diskUsedMb, inodeUsed };
  }

  // SSH Key Management
  async addSSHKey(systemUserId: string, dto: AddSSHKeyDto, performedBy?: string): Promise<SSHKey> {
    const systemUser = await this.systemUserRepository.findOne({ where: { id: systemUserId } });
    if (!systemUser) {
      throw new NotFoundException(`System user not found`);
    }

    if (!systemUser.sshEnabled) {
      throw new BadRequestException('SSH is disabled for this user');
    }

    // Parse and validate the SSH key
    const keyInfo = this.parseSSHPublicKey(dto.publicKey);
    if (!keyInfo) {
      throw new BadRequestException('Invalid SSH public key format');
    }

    // Check for duplicate fingerprint
    const existingKey = await this.sshKeyRepository.findOne({
      where: { fingerprint: keyInfo.fingerprint },
    });
    if (existingKey) {
      throw new ConflictException('This SSH key is already in use');
    }

    const operationId = `add-ssh-key-${Date.now()}`;
    this.auditLogger.startOperation(operationId);
    const auditContext: AuditContext = { userId: performedBy };

    try {
      // Create SSH key record
      const sshKey = this.sshKeyRepository.create({
        name: dto.name,
        publicKey: dto.publicKey.trim(),
        fingerprint: keyInfo.fingerprint,
        keyType: keyInfo.type,
        keyBits: keyInfo.bits,
        systemUserId,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      });

      const savedKey = await this.sshKeyRepository.save(sshKey);

      // Update authorized_keys file
      await this.syncAuthorizedKeys(systemUser);

      await this.auditLogger.logOperationComplete(operationId, {
        operationType: AuditOperationType.CREATE,
        resourceType: AuditResourceType.USER,
        resourceId: savedKey.id,
        resourceName: dto.name,
        description: `Added SSH key "${dto.name}" for user ${systemUser.username}`,
        metadata: { fingerprint: keyInfo.fingerprint, systemUserId },
      }, auditContext);
      return savedKey;
    } catch (error) {
      await this.auditLogger.logOperationFailed(operationId, {
        operationType: AuditOperationType.CREATE,
        resourceType: AuditResourceType.USER,
        resourceName: dto.name,
        description: `Failed to add SSH key for user ${systemUser.username}`,
      }, error instanceof Error ? error : new Error(String(error)), auditContext);
      throw error;
    }
  }

  async removeSSHKey(systemUserId: string, keyId: string, performedBy?: string): Promise<void> {
    const systemUser = await this.systemUserRepository.findOne({ where: { id: systemUserId } });
    if (!systemUser) {
      throw new NotFoundException(`System user not found`);
    }

    const sshKey = await this.sshKeyRepository.findOne({
      where: { id: keyId, systemUserId },
    });
    if (!sshKey) {
      throw new NotFoundException(`SSH key not found`);
    }

    await this.auditLogger.log({
      operationType: AuditOperationType.DELETE,
      resourceType: AuditResourceType.USER,
      resourceId: keyId,
      resourceName: sshKey.name,
      description: `Removed SSH key "${sshKey.name}" from user ${systemUser.username}`,
      metadata: { fingerprint: sshKey.fingerprint },
    }, { userId: performedBy });

    await this.sshKeyRepository.delete(keyId);

    // Update authorized_keys file
    await this.syncAuthorizedKeys(systemUser);
  }

  async listSSHKeys(systemUserId: string): Promise<SSHKey[]> {
    return this.sshKeyRepository.find({
      where: { systemUserId },
      order: { createdAt: 'DESC' },
    });
  }

  // Private helper methods
  private async findNextAvailableUid(): Promise<number> {
    // Get max UID from database
    const result = await this.systemUserRepository
      .createQueryBuilder('systemUser')
      .select('MAX(systemUser.uid)', 'maxUid')
      .getRawOne();

    const maxDbUid = result?.maxUid || this.MIN_UID - 1;

    // Also check system users via getent
    const getentResult = await this.commandExecutor.execute('getent', ['passwd']);
    let maxSystemUid = this.MIN_UID - 1;

    if (getentResult.success) {
      const lines = getentResult.stdout.split('\n');
      for (const line of lines) {
        const parts = line.split(':');
        if (parts.length >= 3) {
          const uid = parseInt(parts[2], 10);
          if (uid >= this.MIN_UID && uid <= this.MAX_UID && uid > maxSystemUid) {
            maxSystemUid = uid;
          }
        }
      }
    }

    const nextUid = Math.max(maxDbUid, maxSystemUid) + 1;

    if (nextUid > this.MAX_UID) {
      throw new Error('No available UIDs');
    }

    return nextUid;
  }

  private async setPasswordInternal(username: string, password: string): Promise<void> {
    // Use chpasswd to set password
    const result = await this.commandExecutor.execute('chpasswd', [], {
      stdin: `${username}:${password}`,
    });

    if (!result.success) {
      throw new Error(`Failed to set password: ${result.stderr}`);
    }
  }

  private async createDirectoryStructure(username: string, transactionId: string): Promise<void> {
    const directories = [
      this.pathResolver.getUserPublicHtml(username),
      this.pathResolver.getUserLogDir(username),
      this.pathResolver.getUserTmpDir(username),
      this.pathResolver.getUserSslDir(username),
      `${this.pathResolver.getUserHomeDir(username)}/.ssh`,
    ];

    for (const dir of directories) {
      const result = await this.commandExecutor.execute('mkdir', ['-p', dir]);
      if (!result.success) {
        throw new Error(`Failed to create directory ${dir}: ${result.stderr}`);
      }

      this.transactionManager.addRollbackAction(transactionId, async () => {
        await this.commandExecutor.execute('rm', ['-rf', dir]);
      });
    }

    // Set ownership
    const homeDir = this.pathResolver.getUserHomeDir(username);
    await this.commandExecutor.execute('chown', ['-R', `${username}:${username}`, homeDir]);

    // Set permissions
    await this.commandExecutor.execute('chmod', ['750', homeDir]);
    await this.commandExecutor.execute('chmod', ['755', this.pathResolver.getUserPublicHtml(username)]);
    await this.commandExecutor.execute('chmod', ['700', `${homeDir}/.ssh`]);

    // Create default index.html
    const indexPath = `${this.pathResolver.getUserPublicHtml(username)}/index.html`;
    const indexContent = this.generateDefaultIndexHtml(username);

    const result = await this.commandExecutor.execute('tee', [indexPath], {
      stdin: indexContent,
      runAs: username,
    });

    if (!result.success) {
      this.logger.warn(`Failed to create default index.html: ${result.stderr}`, 'SystemUsersService');
    }
  }

  private generateDefaultIndexHtml(username: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
        }
        .container {
            padding: 2rem;
            max-width: 600px;
        }
        h1 { font-size: 2.5rem; margin-bottom: 1rem; }
        p { font-size: 1.2rem; opacity: 0.9; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome!</h1>
        <p>This site is ready for configuration.</p>
        <p><small>Account: ${username}</small></p>
    </div>
</body>
</html>`;
  }

  private async setQuotaInternal(username: string, diskQuotaMb: number, inodeQuota: number): Promise<void> {
    // Convert MB to blocks (assuming 1KB blocks)
    const softBlockLimit = diskQuotaMb * 1024;
    const hardBlockLimit = Math.round(softBlockLimit * 1.1); // 10% grace

    const softInodeLimit = inodeQuota;
    const hardInodeLimit = Math.round(inodeQuota * 1.1);

    const result = await this.commandExecutor.execute('setquota', [
      '-u',
      username,
      String(softBlockLimit),
      String(hardBlockLimit),
      String(softInodeLimit),
      String(hardInodeLimit),
      '/home',
    ]);

    if (!result.success) {
      this.logger.warn(`Failed to set quota for ${username}: ${result.stderr}`, 'SystemUsersService');
    }
  }

  private async suspendUserInternal(username: string): Promise<void> {
    // Lock the user account
    await this.commandExecutor.execute('usermod', ['-L', username]);

    // Change shell to nologin
    await this.commandExecutor.execute('usermod', ['-s', '/usr/sbin/nologin', username]);

    this.logger.log(`Suspended user: ${username}`, 'SystemUsersService');
  }

  private async unsuspendUserInternal(username: string): Promise<void> {
    // Unlock the user account
    await this.commandExecutor.execute('usermod', ['-U', username]);

    // Restore shell to bash
    await this.commandExecutor.execute('usermod', ['-s', '/bin/bash', username]);

    this.logger.log(`Unsuspended user: ${username}`, 'SystemUsersService');
  }

  private async syncAuthorizedKeys(systemUser: SystemUser): Promise<void> {
    const sshKeys = await this.sshKeyRepository.find({
      where: { systemUserId: systemUser.id },
    });

    // Filter out expired keys
    const validKeys = sshKeys.filter((key) => !key.isExpired());

    const authorizedKeysPath = this.pathResolver.getSshAuthorizedKeysPath(systemUser.username);
    const content = validKeys.map((key) => key.publicKey).join('\n') + '\n';

    // Ensure .ssh directory exists
    const sshDir = `${systemUser.homeDirectory}/.ssh`;
    await this.commandExecutor.execute('mkdir', ['-p', sshDir]);
    await this.commandExecutor.execute('chmod', ['700', sshDir]);
    await this.commandExecutor.execute('chown', [`${systemUser.username}:${systemUser.username}`, sshDir]);

    // Write authorized_keys
    const result = await this.commandExecutor.execute('tee', [authorizedKeysPath], {
      stdin: content,
    });

    if (!result.success) {
      throw new Error(`Failed to update authorized_keys: ${result.stderr}`);
    }

    // Set permissions
    await this.commandExecutor.execute('chmod', ['600', authorizedKeysPath]);
    await this.commandExecutor.execute('chown', [`${systemUser.username}:${systemUser.username}`, authorizedKeysPath]);
  }

  private parseSSHPublicKey(publicKey: string): { type: SSHKeyType; fingerprint: string; bits?: number } | null {
    const trimmedKey = publicKey.trim();
    const parts = trimmedKey.split(/\s+/);

    if (parts.length < 2) {
      return null;
    }

    const keyTypeStr = parts[0];
    const keyData = parts[1];

    let keyType: SSHKeyType;
    let bits: number | undefined;

    switch (keyTypeStr) {
      case 'ssh-rsa':
        keyType = SSHKeyType.RSA;
        bits = this.estimateRSAKeyBits(keyData);
        break;
      case 'ssh-ed25519':
        keyType = SSHKeyType.ED25519;
        bits = 256;
        break;
      case 'ecdsa-sha2-nistp256':
        keyType = SSHKeyType.ECDSA;
        bits = 256;
        break;
      case 'ecdsa-sha2-nistp384':
        keyType = SSHKeyType.ECDSA;
        bits = 384;
        break;
      case 'ecdsa-sha2-nistp521':
        keyType = SSHKeyType.ECDSA;
        bits = 521;
        break;
      case 'ssh-dss':
        keyType = SSHKeyType.DSA;
        bits = 1024;
        break;
      default:
        return null;
    }

    // Calculate fingerprint (SHA256)
    try {
      const keyBuffer = Buffer.from(keyData, 'base64');
      const hash = crypto.createHash('sha256').update(keyBuffer).digest('base64');
      const fingerprint = `SHA256:${hash.replace(/=+$/, '')}`;

      return { type: keyType, fingerprint, bits };
    } catch {
      return null;
    }
  }

  private estimateRSAKeyBits(base64Data: string): number {
    try {
      const decoded = Buffer.from(base64Data, 'base64');
      // RSA key size can be roughly estimated from the key length
      const byteLength = decoded.length;
      if (byteLength < 200) return 1024;
      if (byteLength < 400) return 2048;
      if (byteLength < 600) return 3072;
      return 4096;
    } catch {
      return 2048; // Default assumption
    }
  }
}
