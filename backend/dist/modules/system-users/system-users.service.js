"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemUsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto = __importStar(require("crypto"));
const system_user_entity_js_1 = require("./entities/system-user.entity.js");
const ssh_key_entity_js_1 = require("./entities/ssh-key.entity.js");
const command_executor_service_js_1 = require("../../core/executor/command-executor.service.js");
const path_resolver_service_js_1 = require("../../core/distro/path-resolver.service.js");
const transaction_manager_service_js_1 = require("../../core/rollback/transaction-manager.service.js");
const input_validator_service_js_1 = require("../../core/validators/input-validator.service.js");
const audit_logger_service_js_1 = require("../../core/audit/audit-logger.service.js");
const audit_log_entity_js_1 = require("../../core/audit/entities/audit-log.entity.js");
const logger_service_js_1 = require("../../common/logger/logger.service.js");
let SystemUsersService = class SystemUsersService {
    systemUserRepository;
    sshKeyRepository;
    commandExecutor;
    pathResolver;
    transactionManager;
    inputValidator;
    auditLogger;
    logger;
    MIN_UID = 1000;
    MAX_UID = 60000;
    constructor(systemUserRepository, sshKeyRepository, commandExecutor, pathResolver, transactionManager, inputValidator, auditLogger, logger) {
        this.systemUserRepository = systemUserRepository;
        this.sshKeyRepository = sshKeyRepository;
        this.commandExecutor = commandExecutor;
        this.pathResolver = pathResolver;
        this.transactionManager = transactionManager;
        this.inputValidator = inputValidator;
        this.auditLogger = auditLogger;
        this.logger = logger;
    }
    async create(dto, performedBy) {
        const usernameValidation = this.inputValidator.validateUsername(dto.username);
        if (!usernameValidation.isValid) {
            throw new common_1.BadRequestException(usernameValidation.error);
        }
        const username = usernameValidation.sanitized;
        const existing = await this.systemUserRepository.findOne({ where: { username } });
        if (existing) {
            throw new common_1.ConflictException(`User "${username}" already exists`);
        }
        const checkResult = await this.commandExecutor.execute('id', [username]);
        if (checkResult.success) {
            throw new common_1.ConflictException(`System user "${username}" already exists on this server`);
        }
        const operationId = `create-system-user-${Date.now()}`;
        this.auditLogger.startOperation(operationId);
        const auditContext = { userId: performedBy };
        return this.transactionManager.withTransaction(async (transactionId) => {
            try {
                const uid = await this.findNextAvailableUid();
                const gid = uid;
                const homeDirectory = this.pathResolver.getUserHomeDir(username);
                const shell = dto.shell || '/bin/bash';
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
                this.transactionManager.addRollbackAction(transactionId, async () => {
                    await this.commandExecutor.execute('userdel', ['-r', '-f', username]);
                });
                if (dto.password) {
                    await this.setPasswordInternal(username, dto.password);
                }
                await this.createDirectoryStructure(username, transactionId);
                if (dto.diskQuotaMb && dto.diskQuotaMb > 0) {
                    await this.setQuotaInternal(username, dto.diskQuotaMb, dto.inodeQuota || 0);
                }
                if (dto.sftpOnly) {
                    await this.commandExecutor.execute('usermod', ['-s', '/usr/sbin/nologin', username]);
                }
                const systemUser = this.systemUserRepository.create({
                    username,
                    uid,
                    gid,
                    homeDirectory,
                    shell: dto.sftpOnly ? '/usr/sbin/nologin' : shell,
                    status: system_user_entity_js_1.SystemUserStatus.ACTIVE,
                    diskQuotaMb: dto.diskQuotaMb || 0,
                    inodeQuota: dto.inodeQuota || 0,
                    sshEnabled: dto.sshEnabled ?? true,
                    sftpOnly: dto.sftpOnly ?? false,
                    ownerId: dto.ownerId,
                });
                const savedUser = await this.systemUserRepository.save(systemUser);
                await this.auditLogger.logOperationComplete(operationId, {
                    operationType: audit_log_entity_js_1.AuditOperationType.CREATE,
                    resourceType: audit_log_entity_js_1.AuditResourceType.USER,
                    resourceId: savedUser.id,
                    resourceName: username,
                    description: `Created system user ${username} (UID: ${uid})`,
                }, auditContext);
                this.logger.log(`Created system user: ${username} (UID: ${uid})`, 'SystemUsersService');
                return savedUser;
            }
            catch (error) {
                await this.auditLogger.logOperationFailed(operationId, {
                    operationType: audit_log_entity_js_1.AuditOperationType.CREATE,
                    resourceType: audit_log_entity_js_1.AuditResourceType.USER,
                    resourceName: username,
                    description: `Failed to create system user ${username}`,
                }, error instanceof Error ? error : new Error(String(error)), auditContext);
                throw error;
            }
        });
    }
    async findAll(ownerId) {
        const queryBuilder = this.systemUserRepository.createQueryBuilder('systemUser');
        if (ownerId) {
            queryBuilder.where('systemUser.ownerId = :ownerId', { ownerId });
        }
        return queryBuilder.orderBy('systemUser.createdAt', 'DESC').getMany();
    }
    async findOne(id) {
        const systemUser = await this.systemUserRepository.findOne({ where: { id } });
        if (!systemUser) {
            throw new common_1.NotFoundException(`System user not found`);
        }
        const sshKeys = await this.sshKeyRepository.find({
            where: { systemUserId: id },
            order: { createdAt: 'DESC' },
        });
        return { ...systemUser, sshKeys };
    }
    async findByUsername(username) {
        return this.systemUserRepository.findOne({ where: { username } });
    }
    async update(id, dto, performedBy) {
        const systemUser = await this.systemUserRepository.findOne({ where: { id } });
        if (!systemUser) {
            throw new common_1.NotFoundException(`System user not found`);
        }
        const operationId = `update-system-user-${Date.now()}`;
        this.auditLogger.startOperation(operationId);
        const auditContext = { userId: performedBy };
        try {
            if (dto.password) {
                await this.setPasswordInternal(systemUser.username, dto.password);
            }
            if (dto.shell && dto.shell !== systemUser.shell) {
                await this.commandExecutor.execute('usermod', ['-s', dto.shell, systemUser.username]);
                systemUser.shell = dto.shell;
            }
            if (dto.sftpOnly !== undefined && dto.sftpOnly !== systemUser.sftpOnly) {
                const newShell = dto.sftpOnly ? '/usr/sbin/nologin' : '/bin/bash';
                await this.commandExecutor.execute('usermod', ['-s', newShell, systemUser.username]);
                systemUser.sftpOnly = dto.sftpOnly;
                systemUser.shell = newShell;
            }
            if (dto.diskQuotaMb !== undefined || dto.inodeQuota !== undefined) {
                const diskQuota = dto.diskQuotaMb ?? systemUser.diskQuotaMb;
                const inodeQuota = dto.inodeQuota ?? systemUser.inodeQuota;
                await this.setQuotaInternal(systemUser.username, diskQuota, inodeQuota);
                systemUser.diskQuotaMb = diskQuota;
                systemUser.inodeQuota = inodeQuota;
            }
            if (dto.status !== undefined && dto.status !== systemUser.status) {
                if (dto.status === system_user_entity_js_1.SystemUserStatus.SUSPENDED) {
                    await this.suspendUserInternal(systemUser.username);
                }
                else if (dto.status === system_user_entity_js_1.SystemUserStatus.ACTIVE && systemUser.status === system_user_entity_js_1.SystemUserStatus.SUSPENDED) {
                    await this.unsuspendUserInternal(systemUser.username);
                }
                systemUser.status = dto.status;
            }
            if (dto.sshEnabled !== undefined) {
                systemUser.sshEnabled = dto.sshEnabled;
                if (!dto.sshEnabled) {
                    const sshPath = this.pathResolver.getSshAuthorizedKeysPath(systemUser.username);
                    await this.commandExecutor.execute('rm', ['-f', sshPath]);
                }
            }
            const updatedUser = await this.systemUserRepository.save(systemUser);
            await this.auditLogger.logOperationComplete(operationId, {
                operationType: audit_log_entity_js_1.AuditOperationType.UPDATE,
                resourceType: audit_log_entity_js_1.AuditResourceType.USER,
                resourceId: id,
                resourceName: systemUser.username,
                description: `Updated system user ${systemUser.username}`,
                newValue: dto,
            }, auditContext);
            return updatedUser;
        }
        catch (error) {
            await this.auditLogger.logOperationFailed(operationId, {
                operationType: audit_log_entity_js_1.AuditOperationType.UPDATE,
                resourceType: audit_log_entity_js_1.AuditResourceType.USER,
                resourceId: id,
                resourceName: systemUser.username,
                description: `Failed to update system user ${systemUser.username}`,
            }, error instanceof Error ? error : new Error(String(error)), auditContext);
            throw error;
        }
    }
    async delete(id, performedBy) {
        const systemUser = await this.systemUserRepository.findOne({ where: { id } });
        if (!systemUser) {
            throw new common_1.NotFoundException(`System user not found`);
        }
        const operationId = `delete-system-user-${Date.now()}`;
        this.auditLogger.startOperation(operationId);
        const auditContext = { userId: performedBy };
        try {
            const result = await this.commandExecutor.execute('userdel', ['-r', '-f', systemUser.username]);
            if (!result.success && !result.stderr.includes('does not exist')) {
                throw new Error(`Failed to delete system user: ${result.stderr}`);
            }
            await this.sshKeyRepository.delete({ systemUserId: id });
            await this.systemUserRepository.softDelete(id);
            await this.auditLogger.logOperationComplete(operationId, {
                operationType: audit_log_entity_js_1.AuditOperationType.DELETE,
                resourceType: audit_log_entity_js_1.AuditResourceType.USER,
                resourceId: id,
                resourceName: systemUser.username,
                description: `Deleted system user ${systemUser.username}`,
            }, auditContext);
            this.logger.log(`Deleted system user: ${systemUser.username}`, 'SystemUsersService');
        }
        catch (error) {
            await this.auditLogger.logOperationFailed(operationId, {
                operationType: audit_log_entity_js_1.AuditOperationType.DELETE,
                resourceType: audit_log_entity_js_1.AuditResourceType.USER,
                resourceId: id,
                resourceName: systemUser.username,
                description: `Failed to delete system user ${systemUser.username}`,
            }, error instanceof Error ? error : new Error(String(error)), auditContext);
            throw error;
        }
    }
    async setPassword(id, password, performedBy) {
        const systemUser = await this.systemUserRepository.findOne({ where: { id } });
        if (!systemUser) {
            throw new common_1.NotFoundException(`System user not found`);
        }
        await this.auditLogger.logSecurityEvent(audit_log_entity_js_1.AuditOperationType.PASSWORD_RESET, `Password changed for system user ${systemUser.username}`, { userId: performedBy }, { systemUserId: id });
        await this.setPasswordInternal(systemUser.username, password);
    }
    async getQuotaUsage(id) {
        const systemUser = await this.systemUserRepository.findOne({ where: { id } });
        if (!systemUser) {
            throw new common_1.NotFoundException(`System user not found`);
        }
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
        const findResult = await this.commandExecutor.execute('find', [
            systemUser.homeDirectory,
            '-type', 'f',
        ]);
        let inodeUsed = 0;
        if (findResult.success) {
            inodeUsed = findResult.stdout.split('\n').filter((line) => line.trim()).length;
        }
        await this.systemUserRepository.update(id, { diskUsedMb, inodeUsed });
        return { diskUsedMb, inodeUsed };
    }
    async addSSHKey(systemUserId, dto, performedBy) {
        const systemUser = await this.systemUserRepository.findOne({ where: { id: systemUserId } });
        if (!systemUser) {
            throw new common_1.NotFoundException(`System user not found`);
        }
        if (!systemUser.sshEnabled) {
            throw new common_1.BadRequestException('SSH is disabled for this user');
        }
        const keyInfo = this.parseSSHPublicKey(dto.publicKey);
        if (!keyInfo) {
            throw new common_1.BadRequestException('Invalid SSH public key format');
        }
        const existingKey = await this.sshKeyRepository.findOne({
            where: { fingerprint: keyInfo.fingerprint },
        });
        if (existingKey) {
            throw new common_1.ConflictException('This SSH key is already in use');
        }
        const operationId = `add-ssh-key-${Date.now()}`;
        this.auditLogger.startOperation(operationId);
        const auditContext = { userId: performedBy };
        try {
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
            await this.syncAuthorizedKeys(systemUser);
            await this.auditLogger.logOperationComplete(operationId, {
                operationType: audit_log_entity_js_1.AuditOperationType.CREATE,
                resourceType: audit_log_entity_js_1.AuditResourceType.USER,
                resourceId: savedKey.id,
                resourceName: dto.name,
                description: `Added SSH key "${dto.name}" for user ${systemUser.username}`,
                metadata: { fingerprint: keyInfo.fingerprint, systemUserId },
            }, auditContext);
            return savedKey;
        }
        catch (error) {
            await this.auditLogger.logOperationFailed(operationId, {
                operationType: audit_log_entity_js_1.AuditOperationType.CREATE,
                resourceType: audit_log_entity_js_1.AuditResourceType.USER,
                resourceName: dto.name,
                description: `Failed to add SSH key for user ${systemUser.username}`,
            }, error instanceof Error ? error : new Error(String(error)), auditContext);
            throw error;
        }
    }
    async removeSSHKey(systemUserId, keyId, performedBy) {
        const systemUser = await this.systemUserRepository.findOne({ where: { id: systemUserId } });
        if (!systemUser) {
            throw new common_1.NotFoundException(`System user not found`);
        }
        const sshKey = await this.sshKeyRepository.findOne({
            where: { id: keyId, systemUserId },
        });
        if (!sshKey) {
            throw new common_1.NotFoundException(`SSH key not found`);
        }
        await this.auditLogger.log({
            operationType: audit_log_entity_js_1.AuditOperationType.DELETE,
            resourceType: audit_log_entity_js_1.AuditResourceType.USER,
            resourceId: keyId,
            resourceName: sshKey.name,
            description: `Removed SSH key "${sshKey.name}" from user ${systemUser.username}`,
            metadata: { fingerprint: sshKey.fingerprint },
        }, { userId: performedBy });
        await this.sshKeyRepository.delete(keyId);
        await this.syncAuthorizedKeys(systemUser);
    }
    async listSSHKeys(systemUserId) {
        return this.sshKeyRepository.find({
            where: { systemUserId },
            order: { createdAt: 'DESC' },
        });
    }
    async findNextAvailableUid() {
        const result = await this.systemUserRepository
            .createQueryBuilder('systemUser')
            .select('MAX(systemUser.uid)', 'maxUid')
            .getRawOne();
        const maxDbUid = result?.maxUid || this.MIN_UID - 1;
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
    async setPasswordInternal(username, password) {
        const result = await this.commandExecutor.execute('chpasswd', [], {
            stdin: `${username}:${password}`,
        });
        if (!result.success) {
            throw new Error(`Failed to set password: ${result.stderr}`);
        }
    }
    async createDirectoryStructure(username, transactionId) {
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
        const homeDir = this.pathResolver.getUserHomeDir(username);
        await this.commandExecutor.execute('chown', ['-R', `${username}:${username}`, homeDir]);
        await this.commandExecutor.execute('chmod', ['750', homeDir]);
        await this.commandExecutor.execute('chmod', ['755', this.pathResolver.getUserPublicHtml(username)]);
        await this.commandExecutor.execute('chmod', ['700', `${homeDir}/.ssh`]);
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
    generateDefaultIndexHtml(username) {
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
    async setQuotaInternal(username, diskQuotaMb, inodeQuota) {
        const softBlockLimit = diskQuotaMb * 1024;
        const hardBlockLimit = Math.round(softBlockLimit * 1.1);
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
    async suspendUserInternal(username) {
        await this.commandExecutor.execute('usermod', ['-L', username]);
        await this.commandExecutor.execute('usermod', ['-s', '/usr/sbin/nologin', username]);
        this.logger.log(`Suspended user: ${username}`, 'SystemUsersService');
    }
    async unsuspendUserInternal(username) {
        await this.commandExecutor.execute('usermod', ['-U', username]);
        await this.commandExecutor.execute('usermod', ['-s', '/bin/bash', username]);
        this.logger.log(`Unsuspended user: ${username}`, 'SystemUsersService');
    }
    async syncAuthorizedKeys(systemUser) {
        const sshKeys = await this.sshKeyRepository.find({
            where: { systemUserId: systemUser.id },
        });
        const validKeys = sshKeys.filter((key) => !key.isExpired());
        const authorizedKeysPath = this.pathResolver.getSshAuthorizedKeysPath(systemUser.username);
        const content = validKeys.map((key) => key.publicKey).join('\n') + '\n';
        const sshDir = `${systemUser.homeDirectory}/.ssh`;
        await this.commandExecutor.execute('mkdir', ['-p', sshDir]);
        await this.commandExecutor.execute('chmod', ['700', sshDir]);
        await this.commandExecutor.execute('chown', [`${systemUser.username}:${systemUser.username}`, sshDir]);
        const result = await this.commandExecutor.execute('tee', [authorizedKeysPath], {
            stdin: content,
        });
        if (!result.success) {
            throw new Error(`Failed to update authorized_keys: ${result.stderr}`);
        }
        await this.commandExecutor.execute('chmod', ['600', authorizedKeysPath]);
        await this.commandExecutor.execute('chown', [`${systemUser.username}:${systemUser.username}`, authorizedKeysPath]);
    }
    parseSSHPublicKey(publicKey) {
        const trimmedKey = publicKey.trim();
        const parts = trimmedKey.split(/\s+/);
        if (parts.length < 2) {
            return null;
        }
        const keyTypeStr = parts[0];
        const keyData = parts[1];
        let keyType;
        let bits;
        switch (keyTypeStr) {
            case 'ssh-rsa':
                keyType = ssh_key_entity_js_1.SSHKeyType.RSA;
                bits = this.estimateRSAKeyBits(keyData);
                break;
            case 'ssh-ed25519':
                keyType = ssh_key_entity_js_1.SSHKeyType.ED25519;
                bits = 256;
                break;
            case 'ecdsa-sha2-nistp256':
                keyType = ssh_key_entity_js_1.SSHKeyType.ECDSA;
                bits = 256;
                break;
            case 'ecdsa-sha2-nistp384':
                keyType = ssh_key_entity_js_1.SSHKeyType.ECDSA;
                bits = 384;
                break;
            case 'ecdsa-sha2-nistp521':
                keyType = ssh_key_entity_js_1.SSHKeyType.ECDSA;
                bits = 521;
                break;
            case 'ssh-dss':
                keyType = ssh_key_entity_js_1.SSHKeyType.DSA;
                bits = 1024;
                break;
            default:
                return null;
        }
        try {
            const keyBuffer = Buffer.from(keyData, 'base64');
            const hash = crypto.createHash('sha256').update(keyBuffer).digest('base64');
            const fingerprint = `SHA256:${hash.replace(/=+$/, '')}`;
            return { type: keyType, fingerprint, bits };
        }
        catch {
            return null;
        }
    }
    estimateRSAKeyBits(base64Data) {
        try {
            const decoded = Buffer.from(base64Data, 'base64');
            const byteLength = decoded.length;
            if (byteLength < 200)
                return 1024;
            if (byteLength < 400)
                return 2048;
            if (byteLength < 600)
                return 3072;
            return 4096;
        }
        catch {
            return 2048;
        }
    }
};
exports.SystemUsersService = SystemUsersService;
exports.SystemUsersService = SystemUsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(system_user_entity_js_1.SystemUser)),
    __param(1, (0, typeorm_1.InjectRepository)(ssh_key_entity_js_1.SSHKey)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        command_executor_service_js_1.CommandExecutorService,
        path_resolver_service_js_1.PathResolverService,
        transaction_manager_service_js_1.TransactionManagerService,
        input_validator_service_js_1.InputValidatorService,
        audit_logger_service_js_1.AuditLoggerService,
        logger_service_js_1.LoggerService])
], SystemUsersService);
//# sourceMappingURL=system-users.service.js.map