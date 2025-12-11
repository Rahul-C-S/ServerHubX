import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Domain, DomainStatus, RuntimeType, WebServer } from './entities/domain.entity.js';
import { Subdomain, SubdomainStatus } from './entities/subdomain.entity.js';
import { CreateDomainDto } from './dto/create-domain.dto.js';
import { UpdateDomainDto } from './dto/update-domain.dto.js';
import { CreateSubdomainDto } from './dto/create-subdomain.dto.js';
import { VhostService, VhostConfig } from './services/vhost.service.js';
import { PhpFpmService } from './services/php-fpm.service.js';
import { SystemUsersService } from '../system-users/system-users.service.js';
import { TransactionManagerService } from '../../core/rollback/transaction-manager.service.js';
import { InputValidatorService } from '../../core/validators/input-validator.service.js';
import { AuditLoggerService, AuditContext } from '../../core/audit/audit-logger.service.js';
import { AuditOperationType, AuditResourceType } from '../../core/audit/entities/audit-log.entity.js';
import { PathResolverService } from '../../core/distro/path-resolver.service.js';
import { LoggerService } from '../../common/logger/logger.service.js';

@Injectable()
export class DomainsService {
  constructor(
    @InjectRepository(Domain)
    private readonly domainRepository: Repository<Domain>,
    @InjectRepository(Subdomain)
    private readonly subdomainRepository: Repository<Subdomain>,
    private readonly vhostService: VhostService,
    private readonly phpFpmService: PhpFpmService,
    private readonly systemUsersService: SystemUsersService,
    private readonly transactionManager: TransactionManagerService,
    private readonly inputValidator: InputValidatorService,
    private readonly auditLogger: AuditLoggerService,
    private readonly pathResolver: PathResolverService,
    private readonly logger: LoggerService,
  ) {}

  async create(dto: CreateDomainDto, performedBy?: string): Promise<Domain> {
    // Validate domain name
    const domainValidation = this.inputValidator.validateDomainName(dto.name);
    if (!domainValidation.isValid) {
      throw new BadRequestException(domainValidation.error);
    }
    const domainName = domainValidation.sanitized!;

    // Check if domain already exists
    const existing = await this.domainRepository.findOne({
      where: { name: domainName },
    });
    if (existing) {
      throw new ConflictException(`Domain "${domainName}" already exists`);
    }

    const operationId = `create-domain-${Date.now()}`;
    this.auditLogger.startOperation(operationId);
    const auditContext: AuditContext = { userId: performedBy };

    return this.transactionManager.withTransaction(async (transactionId) => {
      try {
        // Generate username from domain (max 32 chars)
        const username = this.generateUsername(domainName);

        // Create system user
        const systemUser = await this.systemUsersService.create(
          {
            username,
            sshEnabled: true,
            sftpOnly: false,
          },
          performedBy,
        );

        // Add rollback action for system user
        this.transactionManager.addRollbackAction(transactionId, async () => {
          await this.systemUsersService.delete(systemUser.id, performedBy);
        });

        const documentRoot = this.pathResolver.getUserPublicHtml(username);
        const phpVersion = dto.phpVersion || '8.2';
        const runtimeType = dto.runtimeType || RuntimeType.PHP;

        // Create domain record
        const domain = this.domainRepository.create({
          name: domainName,
          status: DomainStatus.PENDING,
          documentRoot,
          webServer: dto.webServer || WebServer.APACHE,
          runtimeType,
          phpVersion: runtimeType === RuntimeType.PHP ? phpVersion : undefined,
          nodeVersion: runtimeType === RuntimeType.NODEJS ? (dto.nodeVersion || '20') : undefined,
          wwwRedirect: dto.wwwRedirect ?? true,
          customErrorPages: dto.customErrorPages,
          ownerId: dto.ownerId || performedBy!,
          systemUserId: systemUser.id,
        });

        const savedDomain = await this.domainRepository.save(domain);

        // Create PHP-FPM pool if PHP runtime
        if (runtimeType === RuntimeType.PHP) {
          await this.phpFpmService.writePoolConfig(
            {
              username,
              phpVersion,
            },
            transactionId,
          );

          await this.phpFpmService.reloadPhpFpm(phpVersion);
        }

        // Generate and write Apache vhost
        const vhostConfig: VhostConfig = {
          domain: domainName,
          documentRoot,
          username,
          runtimeType,
          phpVersion: runtimeType === RuntimeType.PHP ? phpVersion : undefined,
          wwwRedirect: dto.wwwRedirect ?? true,
          customErrorPages: dto.customErrorPages,
        };

        const vhostContent = await this.vhostService.generateVhostConfig(vhostConfig);
        await this.vhostService.writeVhostFile(domainName, vhostContent, transactionId);

        // Enable the site
        await this.vhostService.enableSite(domainName);

        // Validate Apache config before reloading
        const validation = await this.vhostService.validateConfig();
        if (!validation.valid) {
          throw new Error(`Apache configuration error: ${validation.error}`);
        }

        // Reload Apache
        await this.vhostService.reloadApache();

        // Update domain status to active
        savedDomain.status = DomainStatus.ACTIVE;
        await this.domainRepository.save(savedDomain);

        await this.auditLogger.logOperationComplete(operationId, {
          operationType: AuditOperationType.CREATE,
          resourceType: AuditResourceType.DOMAIN,
          resourceId: savedDomain.id,
          resourceName: domainName,
          description: `Created domain ${domainName}`,
          metadata: { systemUserId: systemUser.id },
        }, auditContext);

        this.logger.log(`Created domain: ${domainName}`, 'DomainsService');
        return savedDomain;
      } catch (error) {
        await this.auditLogger.logOperationFailed(operationId, {
          operationType: AuditOperationType.CREATE,
          resourceType: AuditResourceType.DOMAIN,
          resourceName: domainName,
          description: `Failed to create domain ${domainName}`,
        }, error instanceof Error ? error : new Error(String(error)), auditContext);
        throw error;
      }
    });
  }

  async findAll(ownerId?: string): Promise<Domain[]> {
    const queryBuilder = this.domainRepository
      .createQueryBuilder('domain')
      .leftJoinAndSelect('domain.systemUser', 'systemUser');

    if (ownerId) {
      queryBuilder.where('domain.ownerId = :ownerId', { ownerId });
    }

    return queryBuilder.orderBy('domain.createdAt', 'DESC').getMany();
  }

  async findOne(id: string): Promise<Domain> {
    const domain = await this.domainRepository.findOne({
      where: { id },
      relations: ['systemUser', 'owner'],
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    return domain;
  }

  async findByName(name: string): Promise<Domain | null> {
    return this.domainRepository.findOne({
      where: { name },
      relations: ['systemUser'],
    });
  }

  async update(id: string, dto: UpdateDomainDto, performedBy?: string): Promise<Domain> {
    const domain = await this.findOne(id);

    const operationId = `update-domain-${Date.now()}`;
    this.auditLogger.startOperation(operationId);
    const auditContext: AuditContext = { userId: performedBy };

    try {
      let needsVhostUpdate = false;
      let needsPhpFpmUpdate = false;

      // Update runtime type
      if (dto.runtimeType !== undefined && dto.runtimeType !== domain.runtimeType) {
        domain.runtimeType = dto.runtimeType;
        needsVhostUpdate = true;

        // If changing to PHP, need PHP-FPM pool
        if (dto.runtimeType === RuntimeType.PHP && !domain.phpVersion) {
          domain.phpVersion = dto.phpVersion || '8.2';
          needsPhpFpmUpdate = true;
        }
      }

      // Update PHP version
      if (dto.phpVersion !== undefined && dto.phpVersion !== domain.phpVersion) {
        domain.phpVersion = dto.phpVersion;
        needsPhpFpmUpdate = true;
        needsVhostUpdate = true;
      }

      // Update Node version
      if (dto.nodeVersion !== undefined) {
        domain.nodeVersion = dto.nodeVersion;
      }

      // Update SSL settings
      if (dto.sslEnabled !== undefined) {
        domain.sslEnabled = dto.sslEnabled;
        needsVhostUpdate = true;
      }

      if (dto.forceHttps !== undefined) {
        domain.forceHttps = dto.forceHttps;
        needsVhostUpdate = true;
      }

      // Update WWW redirect
      if (dto.wwwRedirect !== undefined) {
        domain.wwwRedirect = dto.wwwRedirect;
        needsVhostUpdate = true;
      }

      // Update custom error pages
      if (dto.customErrorPages !== undefined) {
        domain.customErrorPages = dto.customErrorPages;
        needsVhostUpdate = true;
      }

      // Update extra Apache config
      if (dto.extraApacheConfig !== undefined) {
        domain.extraApacheConfig = dto.extraApacheConfig;
        needsVhostUpdate = true;
      }

      // Handle status change
      if (dto.status !== undefined && dto.status !== domain.status) {
        if (dto.status === DomainStatus.SUSPENDED) {
          await this.suspend(id, performedBy);
        } else if (dto.status === DomainStatus.ACTIVE && domain.status === DomainStatus.SUSPENDED) {
          await this.unsuspend(id, performedBy);
        }
        domain.status = dto.status;
      }

      // Save domain changes
      const updatedDomain = await this.domainRepository.save(domain);

      // Apply configuration changes
      if (needsPhpFpmUpdate && domain.runtimeType === RuntimeType.PHP) {
        await this.transactionManager.withTransaction(async (transactionId) => {
          await this.phpFpmService.writePoolConfig(
            {
              username: domain.systemUser.username,
              phpVersion: domain.phpVersion!,
            },
            transactionId,
          );
          await this.phpFpmService.reloadPhpFpm(domain.phpVersion!);
        });
      }

      if (needsVhostUpdate) {
        await this.regenerateVhost(domain);
      }

      await this.auditLogger.logOperationComplete(operationId, {
        operationType: AuditOperationType.UPDATE,
        resourceType: AuditResourceType.DOMAIN,
        resourceId: id,
        resourceName: domain.name,
        description: `Updated domain ${domain.name}`,
        newValue: dto as Record<string, unknown>,
      }, auditContext);
      return updatedDomain;
    } catch (error) {
      await this.auditLogger.logOperationFailed(operationId, {
        operationType: AuditOperationType.UPDATE,
        resourceType: AuditResourceType.DOMAIN,
        resourceId: id,
        resourceName: domain.name,
        description: `Failed to update domain ${domain.name}`,
      }, error instanceof Error ? error : new Error(String(error)), auditContext);
      throw error;
    }
  }

  async delete(id: string, performedBy?: string): Promise<void> {
    const domain = await this.findOne(id);

    const operationId = `delete-domain-${Date.now()}`;
    this.auditLogger.startOperation(operationId);
    const auditContext: AuditContext = { userId: performedBy };

    try {
      // Disable and delete vhost
      await this.vhostService.disableSite(domain.name);
      await this.vhostService.deleteVhostFile(domain.name);

      // Delete PHP-FPM pool if applicable
      if (domain.runtimeType === RuntimeType.PHP && domain.phpVersion) {
        await this.phpFpmService.deletePoolConfig(domain.systemUser.username, domain.phpVersion);
        await this.phpFpmService.reloadPhpFpm(domain.phpVersion);
      }

      // Reload Apache
      await this.vhostService.reloadApache();

      // Delete subdomains
      await this.subdomainRepository.delete({ domainId: id });

      // Delete system user (this also deletes home directory)
      await this.systemUsersService.delete(domain.systemUserId, performedBy);

      // Soft delete domain
      await this.domainRepository.softDelete(id);

      await this.auditLogger.logOperationComplete(operationId, {
        operationType: AuditOperationType.DELETE,
        resourceType: AuditResourceType.DOMAIN,
        resourceId: id,
        resourceName: domain.name,
        description: `Deleted domain ${domain.name}`,
      }, auditContext);
      this.logger.log(`Deleted domain: ${domain.name}`, 'DomainsService');
    } catch (error) {
      await this.auditLogger.logOperationFailed(operationId, {
        operationType: AuditOperationType.DELETE,
        resourceType: AuditResourceType.DOMAIN,
        resourceId: id,
        resourceName: domain.name,
        description: `Failed to delete domain ${domain.name}`,
      }, error instanceof Error ? error : new Error(String(error)), auditContext);
      throw error;
    }
  }

  async suspend(id: string, performedBy?: string): Promise<Domain> {
    const domain = await this.findOne(id);

    await this.auditLogger.log({
      operationType: AuditOperationType.UPDATE,
      resourceType: AuditResourceType.DOMAIN,
      resourceId: id,
      resourceName: domain.name,
      description: `Suspended domain ${domain.name}`,
    }, { userId: performedBy });

    // Disable the site
    await this.vhostService.disableSite(domain.name);
    await this.vhostService.reloadApache();

    // Suspend system user
    await this.systemUsersService.update(domain.systemUserId, {
      status: 'SUSPENDED' as any,
    }, performedBy);

    domain.status = DomainStatus.SUSPENDED;
    return this.domainRepository.save(domain);
  }

  async unsuspend(id: string, performedBy?: string): Promise<Domain> {
    const domain = await this.findOne(id);

    await this.auditLogger.log({
      operationType: AuditOperationType.UPDATE,
      resourceType: AuditResourceType.DOMAIN,
      resourceId: id,
      resourceName: domain.name,
      description: `Unsuspended domain ${domain.name}`,
    }, { userId: performedBy });

    // Unsuspend system user
    await this.systemUsersService.update(domain.systemUserId, {
      status: 'ACTIVE' as any,
    }, performedBy);

    // Enable the site
    await this.vhostService.enableSite(domain.name);
    await this.vhostService.reloadApache();

    domain.status = DomainStatus.ACTIVE;
    return this.domainRepository.save(domain);
  }

  async getStats(id: string): Promise<{
    diskUsageMb: number;
    bandwidthUsedMb: number;
    subdomainCount: number;
  }> {
    const domain = await this.findOne(id);

    // Get disk usage from system user
    const quotaUsage = await this.systemUsersService.getQuotaUsage(domain.systemUserId);

    // Count subdomains
    const subdomainCount = await this.subdomainRepository.count({
      where: { domainId: id },
    });

    // Update domain with disk usage
    domain.diskUsageMb = quotaUsage.diskUsedMb;
    await this.domainRepository.save(domain);

    return {
      diskUsageMb: quotaUsage.diskUsedMb,
      bandwidthUsedMb: domain.bandwidthUsedMb,
      subdomainCount,
    };
  }

  // Subdomain methods
  async createSubdomain(dto: CreateSubdomainDto, _performedBy?: string): Promise<Subdomain> {
    const domain = await this.findOne(dto.domainId);

    const fullName = `${dto.name}.${domain.name}`;

    // Check for duplicate
    const existing = await this.subdomainRepository.findOne({
      where: { name: dto.name, domainId: dto.domainId },
    });
    if (existing) {
      throw new ConflictException(`Subdomain "${dto.name}" already exists`);
    }

    const documentRoot = `${domain.documentRoot}/../${dto.name}`;
    const runtimeType = dto.runtimeType || domain.runtimeType;

    return this.transactionManager.withTransaction(async (_transactionId) => {
      // Create subdomain directory
      await this.systemUsersService['commandExecutor'].execute('mkdir', [
        '-p',
        documentRoot,
      ]);

      // Set ownership
      await this.systemUsersService['commandExecutor'].execute('chown', [
        `${domain.systemUser.username}:${domain.systemUser.username}`,
        documentRoot,
      ]);

      // Create subdomain record
      const subdomain = this.subdomainRepository.create({
        name: dto.name,
        fullName,
        documentRoot,
        status: SubdomainStatus.PENDING,
        runtimeType,
        phpVersion: dto.phpVersion || domain.phpVersion,
        nodeVersion: dto.nodeVersion || domain.nodeVersion,
        domainId: dto.domainId,
        appPort: dto.appPort,
        isWildcard: dto.isWildcard ?? false,
      });

      const savedSubdomain = await this.subdomainRepository.save(subdomain);

      // TODO: Generate subdomain vhost (would require separate vhost file)
      // For now, subdomains share parent domain's document root structure

      savedSubdomain.status = SubdomainStatus.ACTIVE;
      await this.subdomainRepository.save(savedSubdomain);

      return savedSubdomain;
    });
  }

  async listSubdomains(domainId: string): Promise<Subdomain[]> {
    return this.subdomainRepository.find({
      where: { domainId },
      order: { createdAt: 'DESC' },
    });
  }

  async deleteSubdomain(id: string): Promise<void> {
    const subdomain = await this.subdomainRepository.findOne({ where: { id } });
    if (!subdomain) {
      throw new NotFoundException('Subdomain not found');
    }

    await this.subdomainRepository.softDelete(id);
  }

  // Private helpers
  private generateUsername(domain: string): string {
    // Remove TLD and special characters
    let username = domain
      .replace(/\.[^.]+$/, '') // Remove TLD
      .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric
      .toLowerCase()
      .substring(0, 28); // Leave room for numbering

    // Ensure it starts with a letter
    if (!/^[a-z]/.test(username)) {
      username = 'u' + username;
    }

    return username;
  }

  private async regenerateVhost(domain: Domain): Promise<void> {
    await this.transactionManager.withTransaction(async (transactionId) => {
      const vhostConfig: VhostConfig = {
        domain: domain.name,
        documentRoot: domain.documentRoot,
        username: domain.systemUser.username,
        runtimeType: domain.runtimeType,
        phpVersion: domain.phpVersion,
        sslEnabled: domain.sslEnabled,
        forceHttps: domain.forceHttps,
        wwwRedirect: domain.wwwRedirect,
        customErrorPages: domain.customErrorPages as Record<string, string>,
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
}
