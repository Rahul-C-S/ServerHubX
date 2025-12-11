"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const domain_entity_js_1 = require("./entities/domain.entity.js");
const subdomain_entity_js_1 = require("./entities/subdomain.entity.js");
const vhost_service_js_1 = require("./services/vhost.service.js");
const php_fpm_service_js_1 = require("./services/php-fpm.service.js");
const system_users_service_js_1 = require("../system-users/system-users.service.js");
const transaction_manager_service_js_1 = require("../../core/rollback/transaction-manager.service.js");
const input_validator_service_js_1 = require("../../core/validators/input-validator.service.js");
const audit_logger_service_js_1 = require("../../core/audit/audit-logger.service.js");
const audit_log_entity_js_1 = require("../../core/audit/entities/audit-log.entity.js");
const path_resolver_service_js_1 = require("../../core/distro/path-resolver.service.js");
const logger_service_js_1 = require("../../common/logger/logger.service.js");
let DomainsService = class DomainsService {
    domainRepository;
    subdomainRepository;
    vhostService;
    phpFpmService;
    systemUsersService;
    transactionManager;
    inputValidator;
    auditLogger;
    pathResolver;
    logger;
    constructor(domainRepository, subdomainRepository, vhostService, phpFpmService, systemUsersService, transactionManager, inputValidator, auditLogger, pathResolver, logger) {
        this.domainRepository = domainRepository;
        this.subdomainRepository = subdomainRepository;
        this.vhostService = vhostService;
        this.phpFpmService = phpFpmService;
        this.systemUsersService = systemUsersService;
        this.transactionManager = transactionManager;
        this.inputValidator = inputValidator;
        this.auditLogger = auditLogger;
        this.pathResolver = pathResolver;
        this.logger = logger;
    }
    async create(dto, performedBy) {
        const domainValidation = this.inputValidator.validateDomainName(dto.name);
        if (!domainValidation.isValid) {
            throw new common_1.BadRequestException(domainValidation.error);
        }
        const domainName = domainValidation.sanitized;
        const existing = await this.domainRepository.findOne({
            where: { name: domainName },
        });
        if (existing) {
            throw new common_1.ConflictException(`Domain "${domainName}" already exists`);
        }
        const operationId = `create-domain-${Date.now()}`;
        this.auditLogger.startOperation(operationId);
        const auditContext = { userId: performedBy };
        return this.transactionManager.withTransaction(async (transactionId) => {
            try {
                const username = this.generateUsername(domainName);
                const systemUser = await this.systemUsersService.create({
                    username,
                    sshEnabled: true,
                    sftpOnly: false,
                }, performedBy);
                this.transactionManager.addRollbackAction(transactionId, async () => {
                    await this.systemUsersService.delete(systemUser.id, performedBy);
                });
                const documentRoot = this.pathResolver.getUserPublicHtml(username);
                const phpVersion = dto.phpVersion || '8.2';
                const runtimeType = dto.runtimeType || domain_entity_js_1.RuntimeType.PHP;
                const domain = this.domainRepository.create({
                    name: domainName,
                    status: domain_entity_js_1.DomainStatus.PENDING,
                    documentRoot,
                    webServer: dto.webServer || domain_entity_js_1.WebServer.APACHE,
                    runtimeType,
                    phpVersion: runtimeType === domain_entity_js_1.RuntimeType.PHP ? phpVersion : undefined,
                    nodeVersion: runtimeType === domain_entity_js_1.RuntimeType.NODEJS ? (dto.nodeVersion || '20') : undefined,
                    wwwRedirect: dto.wwwRedirect ?? true,
                    customErrorPages: dto.customErrorPages,
                    ownerId: dto.ownerId || performedBy,
                    systemUserId: systemUser.id,
                });
                const savedDomain = await this.domainRepository.save(domain);
                if (runtimeType === domain_entity_js_1.RuntimeType.PHP) {
                    await this.phpFpmService.writePoolConfig({
                        username,
                        phpVersion,
                    }, transactionId);
                    await this.phpFpmService.reloadPhpFpm(phpVersion);
                }
                const vhostConfig = {
                    domain: domainName,
                    documentRoot,
                    username,
                    runtimeType,
                    phpVersion: runtimeType === domain_entity_js_1.RuntimeType.PHP ? phpVersion : undefined,
                    wwwRedirect: dto.wwwRedirect ?? true,
                    customErrorPages: dto.customErrorPages,
                };
                const vhostContent = await this.vhostService.generateVhostConfig(vhostConfig);
                await this.vhostService.writeVhostFile(domainName, vhostContent, transactionId);
                await this.vhostService.enableSite(domainName);
                const validation = await this.vhostService.validateConfig();
                if (!validation.valid) {
                    throw new Error(`Apache configuration error: ${validation.error}`);
                }
                await this.vhostService.reloadApache();
                savedDomain.status = domain_entity_js_1.DomainStatus.ACTIVE;
                await this.domainRepository.save(savedDomain);
                await this.auditLogger.logOperationComplete(operationId, {
                    operationType: audit_log_entity_js_1.AuditOperationType.CREATE,
                    resourceType: audit_log_entity_js_1.AuditResourceType.DOMAIN,
                    resourceId: savedDomain.id,
                    resourceName: domainName,
                    description: `Created domain ${domainName}`,
                    metadata: { systemUserId: systemUser.id },
                }, auditContext);
                this.logger.log(`Created domain: ${domainName}`, 'DomainsService');
                return savedDomain;
            }
            catch (error) {
                await this.auditLogger.logOperationFailed(operationId, {
                    operationType: audit_log_entity_js_1.AuditOperationType.CREATE,
                    resourceType: audit_log_entity_js_1.AuditResourceType.DOMAIN,
                    resourceName: domainName,
                    description: `Failed to create domain ${domainName}`,
                }, error instanceof Error ? error : new Error(String(error)), auditContext);
                throw error;
            }
        });
    }
    async findAll(ownerId) {
        const queryBuilder = this.domainRepository
            .createQueryBuilder('domain')
            .leftJoinAndSelect('domain.systemUser', 'systemUser');
        if (ownerId) {
            queryBuilder.where('domain.ownerId = :ownerId', { ownerId });
        }
        return queryBuilder.orderBy('domain.createdAt', 'DESC').getMany();
    }
    async findOne(id) {
        const domain = await this.domainRepository.findOne({
            where: { id },
            relations: ['systemUser', 'owner'],
        });
        if (!domain) {
            throw new common_1.NotFoundException('Domain not found');
        }
        return domain;
    }
    async findByName(name) {
        return this.domainRepository.findOne({
            where: { name },
            relations: ['systemUser'],
        });
    }
    async update(id, dto, performedBy) {
        const domain = await this.findOne(id);
        const operationId = `update-domain-${Date.now()}`;
        this.auditLogger.startOperation(operationId);
        const auditContext = { userId: performedBy };
        try {
            let needsVhostUpdate = false;
            let needsPhpFpmUpdate = false;
            if (dto.runtimeType !== undefined && dto.runtimeType !== domain.runtimeType) {
                domain.runtimeType = dto.runtimeType;
                needsVhostUpdate = true;
                if (dto.runtimeType === domain_entity_js_1.RuntimeType.PHP && !domain.phpVersion) {
                    domain.phpVersion = dto.phpVersion || '8.2';
                    needsPhpFpmUpdate = true;
                }
            }
            if (dto.phpVersion !== undefined && dto.phpVersion !== domain.phpVersion) {
                domain.phpVersion = dto.phpVersion;
                needsPhpFpmUpdate = true;
                needsVhostUpdate = true;
            }
            if (dto.nodeVersion !== undefined) {
                domain.nodeVersion = dto.nodeVersion;
            }
            if (dto.sslEnabled !== undefined) {
                domain.sslEnabled = dto.sslEnabled;
                needsVhostUpdate = true;
            }
            if (dto.forceHttps !== undefined) {
                domain.forceHttps = dto.forceHttps;
                needsVhostUpdate = true;
            }
            if (dto.wwwRedirect !== undefined) {
                domain.wwwRedirect = dto.wwwRedirect;
                needsVhostUpdate = true;
            }
            if (dto.customErrorPages !== undefined) {
                domain.customErrorPages = dto.customErrorPages;
                needsVhostUpdate = true;
            }
            if (dto.extraApacheConfig !== undefined) {
                domain.extraApacheConfig = dto.extraApacheConfig;
                needsVhostUpdate = true;
            }
            if (dto.status !== undefined && dto.status !== domain.status) {
                if (dto.status === domain_entity_js_1.DomainStatus.SUSPENDED) {
                    await this.suspend(id, performedBy);
                }
                else if (dto.status === domain_entity_js_1.DomainStatus.ACTIVE && domain.status === domain_entity_js_1.DomainStatus.SUSPENDED) {
                    await this.unsuspend(id, performedBy);
                }
                domain.status = dto.status;
            }
            const updatedDomain = await this.domainRepository.save(domain);
            if (needsPhpFpmUpdate && domain.runtimeType === domain_entity_js_1.RuntimeType.PHP) {
                await this.transactionManager.withTransaction(async (transactionId) => {
                    await this.phpFpmService.writePoolConfig({
                        username: domain.systemUser.username,
                        phpVersion: domain.phpVersion,
                    }, transactionId);
                    await this.phpFpmService.reloadPhpFpm(domain.phpVersion);
                });
            }
            if (needsVhostUpdate) {
                await this.regenerateVhost(domain);
            }
            await this.auditLogger.logOperationComplete(operationId, {
                operationType: audit_log_entity_js_1.AuditOperationType.UPDATE,
                resourceType: audit_log_entity_js_1.AuditResourceType.DOMAIN,
                resourceId: id,
                resourceName: domain.name,
                description: `Updated domain ${domain.name}`,
                newValue: dto,
            }, auditContext);
            return updatedDomain;
        }
        catch (error) {
            await this.auditLogger.logOperationFailed(operationId, {
                operationType: audit_log_entity_js_1.AuditOperationType.UPDATE,
                resourceType: audit_log_entity_js_1.AuditResourceType.DOMAIN,
                resourceId: id,
                resourceName: domain.name,
                description: `Failed to update domain ${domain.name}`,
            }, error instanceof Error ? error : new Error(String(error)), auditContext);
            throw error;
        }
    }
    async delete(id, performedBy) {
        const domain = await this.findOne(id);
        const operationId = `delete-domain-${Date.now()}`;
        this.auditLogger.startOperation(operationId);
        const auditContext = { userId: performedBy };
        try {
            await this.vhostService.disableSite(domain.name);
            await this.vhostService.deleteVhostFile(domain.name);
            if (domain.runtimeType === domain_entity_js_1.RuntimeType.PHP && domain.phpVersion) {
                await this.phpFpmService.deletePoolConfig(domain.systemUser.username, domain.phpVersion);
                await this.phpFpmService.reloadPhpFpm(domain.phpVersion);
            }
            await this.vhostService.reloadApache();
            await this.subdomainRepository.delete({ domainId: id });
            await this.systemUsersService.delete(domain.systemUserId, performedBy);
            await this.domainRepository.softDelete(id);
            await this.auditLogger.logOperationComplete(operationId, {
                operationType: audit_log_entity_js_1.AuditOperationType.DELETE,
                resourceType: audit_log_entity_js_1.AuditResourceType.DOMAIN,
                resourceId: id,
                resourceName: domain.name,
                description: `Deleted domain ${domain.name}`,
            }, auditContext);
            this.logger.log(`Deleted domain: ${domain.name}`, 'DomainsService');
        }
        catch (error) {
            await this.auditLogger.logOperationFailed(operationId, {
                operationType: audit_log_entity_js_1.AuditOperationType.DELETE,
                resourceType: audit_log_entity_js_1.AuditResourceType.DOMAIN,
                resourceId: id,
                resourceName: domain.name,
                description: `Failed to delete domain ${domain.name}`,
            }, error instanceof Error ? error : new Error(String(error)), auditContext);
            throw error;
        }
    }
    async suspend(id, performedBy) {
        const domain = await this.findOne(id);
        await this.auditLogger.log({
            operationType: audit_log_entity_js_1.AuditOperationType.UPDATE,
            resourceType: audit_log_entity_js_1.AuditResourceType.DOMAIN,
            resourceId: id,
            resourceName: domain.name,
            description: `Suspended domain ${domain.name}`,
        }, { userId: performedBy });
        await this.vhostService.disableSite(domain.name);
        await this.vhostService.reloadApache();
        await this.systemUsersService.update(domain.systemUserId, {
            status: 'SUSPENDED',
        }, performedBy);
        domain.status = domain_entity_js_1.DomainStatus.SUSPENDED;
        return this.domainRepository.save(domain);
    }
    async unsuspend(id, performedBy) {
        const domain = await this.findOne(id);
        await this.auditLogger.log({
            operationType: audit_log_entity_js_1.AuditOperationType.UPDATE,
            resourceType: audit_log_entity_js_1.AuditResourceType.DOMAIN,
            resourceId: id,
            resourceName: domain.name,
            description: `Unsuspended domain ${domain.name}`,
        }, { userId: performedBy });
        await this.systemUsersService.update(domain.systemUserId, {
            status: 'ACTIVE',
        }, performedBy);
        await this.vhostService.enableSite(domain.name);
        await this.vhostService.reloadApache();
        domain.status = domain_entity_js_1.DomainStatus.ACTIVE;
        return this.domainRepository.save(domain);
    }
    async getStats(id) {
        const domain = await this.findOne(id);
        const quotaUsage = await this.systemUsersService.getQuotaUsage(domain.systemUserId);
        const subdomainCount = await this.subdomainRepository.count({
            where: { domainId: id },
        });
        domain.diskUsageMb = quotaUsage.diskUsedMb;
        await this.domainRepository.save(domain);
        return {
            diskUsageMb: quotaUsage.diskUsedMb,
            bandwidthUsedMb: domain.bandwidthUsedMb,
            subdomainCount,
        };
    }
    async createSubdomain(dto, _performedBy) {
        const domain = await this.findOne(dto.domainId);
        const fullName = `${dto.name}.${domain.name}`;
        const existing = await this.subdomainRepository.findOne({
            where: { name: dto.name, domainId: dto.domainId },
        });
        if (existing) {
            throw new common_1.ConflictException(`Subdomain "${dto.name}" already exists`);
        }
        const documentRoot = `${domain.documentRoot}/../${dto.name}`;
        const runtimeType = dto.runtimeType || domain.runtimeType;
        return this.transactionManager.withTransaction(async (_transactionId) => {
            await this.systemUsersService['commandExecutor'].execute('mkdir', [
                '-p',
                documentRoot,
            ]);
            await this.systemUsersService['commandExecutor'].execute('chown', [
                `${domain.systemUser.username}:${domain.systemUser.username}`,
                documentRoot,
            ]);
            const subdomain = this.subdomainRepository.create({
                name: dto.name,
                fullName,
                documentRoot,
                status: subdomain_entity_js_1.SubdomainStatus.PENDING,
                runtimeType,
                phpVersion: dto.phpVersion || domain.phpVersion,
                nodeVersion: dto.nodeVersion || domain.nodeVersion,
                domainId: dto.domainId,
                appPort: dto.appPort,
                isWildcard: dto.isWildcard ?? false,
            });
            const savedSubdomain = await this.subdomainRepository.save(subdomain);
            savedSubdomain.status = subdomain_entity_js_1.SubdomainStatus.ACTIVE;
            await this.subdomainRepository.save(savedSubdomain);
            return savedSubdomain;
        });
    }
    async listSubdomains(domainId) {
        return this.subdomainRepository.find({
            where: { domainId },
            order: { createdAt: 'DESC' },
        });
    }
    async deleteSubdomain(id) {
        const subdomain = await this.subdomainRepository.findOne({ where: { id } });
        if (!subdomain) {
            throw new common_1.NotFoundException('Subdomain not found');
        }
        await this.subdomainRepository.softDelete(id);
    }
    generateUsername(domain) {
        let username = domain
            .replace(/\.[^.]+$/, '')
            .replace(/[^a-z0-9]/g, '')
            .toLowerCase()
            .substring(0, 28);
        if (!/^[a-z]/.test(username)) {
            username = 'u' + username;
        }
        return username;
    }
    async regenerateVhost(domain) {
        await this.transactionManager.withTransaction(async (transactionId) => {
            const vhostConfig = {
                domain: domain.name,
                documentRoot: domain.documentRoot,
                username: domain.systemUser.username,
                runtimeType: domain.runtimeType,
                phpVersion: domain.phpVersion,
                sslEnabled: domain.sslEnabled,
                forceHttps: domain.forceHttps,
                wwwRedirect: domain.wwwRedirect,
                customErrorPages: domain.customErrorPages,
                extraConfig: domain.extraApacheConfig,
            };
            const vhostContent = await this.vhostService.generateVhostConfig(vhostConfig);
            await this.vhostService.writeVhostFile(domain.name, vhostContent, transactionId);
            const validation = await this.vhostService.validateConfig();
            if (!validation.valid) {
                throw new Error(`Apache configuration error: ${validation.error}`);
            }
            await this.vhostService.reloadApache();
        });
    }
};
exports.DomainsService = DomainsService;
exports.DomainsService = DomainsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(domain_entity_js_1.Domain)),
    __param(1, (0, typeorm_1.InjectRepository)(subdomain_entity_js_1.Subdomain)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        vhost_service_js_1.VhostService,
        php_fpm_service_js_1.PhpFpmService,
        system_users_service_js_1.SystemUsersService,
        transaction_manager_service_js_1.TransactionManagerService,
        input_validator_service_js_1.InputValidatorService,
        audit_logger_service_js_1.AuditLoggerService,
        path_resolver_service_js_1.PathResolverService,
        logger_service_js_1.LoggerService])
], DomainsService);
//# sourceMappingURL=domains.service.js.map