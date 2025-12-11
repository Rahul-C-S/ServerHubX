import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailDomain } from './entities/mail-domain.entity.js';
import { Mailbox } from './entities/mailbox.entity.js';
import { MailAlias, AliasType } from './entities/mail-alias.entity.js';
import { PostfixService } from './services/postfix.service.js';
import { DovecotService } from './services/dovecot.service.js';
import { AuditLoggerService } from '../../core/audit/audit-logger.service.js';
import { AuditOperationType, AuditResourceType } from '../../core/audit/entities/audit-log.entity.js';
import { LoggerService } from '../../common/logger/logger.service.js';
import { Domain } from '../domains/entities/domain.entity.js';
import { User } from '../users/entities/user.entity.js';
import { CreateMailDomainDto, UpdateMailDomainDto } from './dto/create-mail-domain.dto.js';
import { CreateMailboxDto, UpdateMailboxDto } from './dto/create-mailbox.dto.js';
import { CreateMailAliasDto, UpdateMailAliasDto } from './dto/create-mail-alias.dto.js';

@Injectable()
export class MailService {
  constructor(
    @InjectRepository(MailDomain)
    private readonly mailDomainRepository: Repository<MailDomain>,
    @InjectRepository(Mailbox)
    private readonly mailboxRepository: Repository<Mailbox>,
    @InjectRepository(MailAlias)
    private readonly mailAliasRepository: Repository<MailAlias>,
    @InjectRepository(Domain)
    private readonly domainRepository: Repository<Domain>,
    private readonly postfixService: PostfixService,
    private readonly dovecotService: DovecotService,
    private readonly auditLogger: AuditLoggerService,
    private readonly logger: LoggerService,
  ) {}

  // ==================== Mail Domain Operations ====================

  async enableMailForDomain(
    domainId: string,
    dto: CreateMailDomainDto,
    performedBy: User,
  ): Promise<MailDomain> {
    const domain = await this.domainRepository.findOne({
      where: { id: domainId },
      relations: ['owner'],
    });

    if (!domain) {
      throw new NotFoundException(`Domain with ID ${domainId} not found`);
    }

    // Check if mail is already enabled for this domain
    const existing = await this.mailDomainRepository.findOne({
      where: { domain: { id: domainId } },
    });

    if (existing) {
      throw new ConflictException(`Mail is already enabled for domain ${domain.name}`);
    }

    // Create mail domain
    const mailDomain = this.mailDomainRepository.create({
      domainName: domain.name,
      domain,
      enabled: dto.enabled ?? true,
      maxMailboxes: dto.maxMailboxes ?? 0,
      maxAliases: dto.maxAliases ?? 0,
      defaultQuotaBytes: dto.defaultQuotaBytes ?? 1024 * 1024 * 1024, // 1GB default
      spamFilterEnabled: dto.spamFilterEnabled ?? true,
      virusScanEnabled: dto.virusScanEnabled ?? true,
      catchAllEnabled: dto.catchAllEnabled ?? false,
      catchAllAddress: dto.catchAllAddress,
    });

    // Generate DKIM keys if enabled
    if (dto.dkimEnabled) {
      await mailDomain.generateDkimKeys();
    }

    const savedMailDomain = await this.mailDomainRepository.save(mailDomain);

    // Create domain directory in mail storage
    await this.dovecotService.createDomainDirectory(domain.name);

    // Update Postfix configuration
    await this.syncPostfixConfig();

    await this.auditLogger.log(
      {
        operationType: AuditOperationType.CREATE,
        resourceType: AuditResourceType.MAIL_DOMAIN,
        resourceId: savedMailDomain.id,
        resourceName: domain.name,
        description: `Enabled mail for domain ${domain.name}`,
        newValue: { domainName: domain.name, dkimEnabled: dto.dkimEnabled },
      },
      { userId: performedBy.id, userEmail: performedBy.email },
    );

    this.logger.log(`Enabled mail for domain: ${domain.name}`, 'MailService');

    return savedMailDomain;
  }

  async updateMailDomain(
    mailDomainId: string,
    dto: UpdateMailDomainDto,
    performedBy: User,
  ): Promise<MailDomain> {
    const mailDomain = await this.mailDomainRepository.findOne({
      where: { id: mailDomainId },
      relations: ['domain'],
    });

    if (!mailDomain) {
      throw new NotFoundException(`Mail domain with ID ${mailDomainId} not found`);
    }

    const oldValue = { ...mailDomain };

    // Update fields
    if (dto.enabled !== undefined) mailDomain.enabled = dto.enabled;
    if (dto.maxMailboxes !== undefined) mailDomain.maxMailboxes = dto.maxMailboxes;
    if (dto.maxAliases !== undefined) mailDomain.maxAliases = dto.maxAliases;
    if (dto.defaultQuotaBytes !== undefined) mailDomain.defaultQuotaBytes = dto.defaultQuotaBytes;
    if (dto.spamFilterEnabled !== undefined) mailDomain.spamFilterEnabled = dto.spamFilterEnabled;
    if (dto.virusScanEnabled !== undefined) mailDomain.virusScanEnabled = dto.virusScanEnabled;
    if (dto.catchAllEnabled !== undefined) mailDomain.catchAllEnabled = dto.catchAllEnabled;
    if (dto.catchAllAddress !== undefined) mailDomain.catchAllAddress = dto.catchAllAddress;

    // Handle DKIM changes
    if (dto.dkimEnabled !== undefined && dto.dkimEnabled !== mailDomain.dkimEnabled) {
      if (dto.dkimEnabled) {
        await mailDomain.generateDkimKeys();
      } else {
        mailDomain.dkimEnabled = false;
        mailDomain.dkimSelector = undefined;
        mailDomain.dkimPrivateKey = undefined;
        mailDomain.dkimPublicKey = undefined;
      }
    }

    const savedMailDomain = await this.mailDomainRepository.save(mailDomain);

    // Update Postfix configuration
    await this.syncPostfixConfig();

    await this.auditLogger.log(
      {
        operationType: AuditOperationType.UPDATE,
        resourceType: AuditResourceType.MAIL_DOMAIN,
        resourceId: savedMailDomain.id,
        resourceName: mailDomain.domainName,
        description: `Updated mail domain ${mailDomain.domainName}`,
        oldValue: { enabled: oldValue.enabled, catchAllEnabled: oldValue.catchAllEnabled },
        newValue: { enabled: dto.enabled, catchAllEnabled: dto.catchAllEnabled },
      },
      { userId: performedBy.id, userEmail: performedBy.email },
    );

    return savedMailDomain;
  }

  async disableMailForDomain(mailDomainId: string, performedBy: User): Promise<void> {
    const mailDomain = await this.mailDomainRepository.findOne({
      where: { id: mailDomainId },
      relations: ['domain', 'mailboxes', 'aliases'],
    });

    if (!mailDomain) {
      throw new NotFoundException(`Mail domain with ID ${mailDomainId} not found`);
    }

    // Check if there are active mailboxes
    if (mailDomain.mailboxes && mailDomain.mailboxes.length > 0) {
      throw new BadRequestException(
        `Cannot disable mail for domain ${mailDomain.domainName} - ${mailDomain.mailboxes.length} mailboxes exist`,
      );
    }

    // Remove domain directory
    await this.dovecotService.removeDomainDirectory(mailDomain.domainName);

    // Delete the mail domain
    await this.mailDomainRepository.remove(mailDomain);

    // Update Postfix configuration
    await this.syncPostfixConfig();

    await this.auditLogger.log(
      {
        operationType: AuditOperationType.DELETE,
        resourceType: AuditResourceType.MAIL_DOMAIN,
        resourceId: mailDomainId,
        resourceName: mailDomain.domainName,
        description: `Disabled mail for domain ${mailDomain.domainName}`,
      },
      { userId: performedBy.id, userEmail: performedBy.email },
    );

    this.logger.log(`Disabled mail for domain: ${mailDomain.domainName}`, 'MailService');
  }

  async getMailDomain(mailDomainId: string): Promise<MailDomain> {
    const mailDomain = await this.mailDomainRepository.findOne({
      where: { id: mailDomainId },
      relations: ['domain', 'mailboxes', 'aliases'],
    });

    if (!mailDomain) {
      throw new NotFoundException(`Mail domain with ID ${mailDomainId} not found`);
    }

    return mailDomain;
  }

  async getMailDomainByDomainId(domainId: string): Promise<MailDomain | null> {
    return this.mailDomainRepository.findOne({
      where: { domain: { id: domainId } },
      relations: ['domain', 'mailboxes', 'aliases'],
    });
  }

  async listMailDomains(): Promise<MailDomain[]> {
    return this.mailDomainRepository.find({
      relations: ['domain'],
      order: { domainName: 'ASC' },
    });
  }

  // ==================== Mailbox Operations ====================

  async createMailbox(
    mailDomainId: string,
    dto: CreateMailboxDto,
    performedBy: User,
  ): Promise<Mailbox> {
    const mailDomain = await this.mailDomainRepository.findOne({
      where: { id: mailDomainId },
      relations: ['mailboxes'],
    });

    if (!mailDomain) {
      throw new NotFoundException(`Mail domain with ID ${mailDomainId} not found`);
    }

    if (!mailDomain.enabled) {
      throw new BadRequestException(`Mail is disabled for domain ${mailDomain.domainName}`);
    }

    // Check mailbox limit
    if (mailDomain.maxMailboxes > 0 && (mailDomain.mailboxes?.length ?? 0) >= mailDomain.maxMailboxes) {
      throw new BadRequestException(
        `Maximum mailbox limit (${mailDomain.maxMailboxes}) reached for domain ${mailDomain.domainName}`,
      );
    }

    // Check if mailbox already exists
    const email = `${dto.localPart}@${mailDomain.domainName}`;
    const existing = await this.mailboxRepository.findOne({
      where: { email },
    });

    if (existing) {
      throw new ConflictException(`Mailbox ${email} already exists`);
    }

    // Create mailbox
    const mailbox = this.mailboxRepository.create({
      localPart: dto.localPart,
      email,
      mailDomain,
      displayName: dto.displayName,
      quotaBytes: dto.quotaBytes ?? mailDomain.defaultQuotaBytes,
      isActive: dto.isActive ?? true,
      forwardingEnabled: dto.forwardingEnabled ?? false,
      forwardingAddresses: dto.forwardingAddresses ?? [],
      keepLocalCopy: dto.keepLocalCopy ?? true,
      autoReplyEnabled: dto.autoReplyEnabled ?? false,
      autoReplySubject: dto.autoReplySubject,
      autoReplyMessage: dto.autoReplyMessage,
      autoReplyStartDate: dto.autoReplyStartDate,
      autoReplyEndDate: dto.autoReplyEndDate,
    });

    // Set password
    await mailbox.setPassword(dto.password);

    const savedMailbox = await this.mailboxRepository.save(mailbox);

    // Create maildir
    await this.dovecotService.createMaildir(mailDomain.domainName, dto.localPart);

    // Sync configurations
    await this.syncDovecotConfig();
    await this.syncPostfixConfig();

    await this.auditLogger.log(
      {
        operationType: AuditOperationType.CREATE,
        resourceType: AuditResourceType.MAILBOX,
        resourceId: savedMailbox.id,
        resourceName: email,
        description: `Created mailbox ${email}`,
        newValue: { email, quotaBytes: mailbox.quotaBytes },
      },
      { userId: performedBy.id, userEmail: performedBy.email },
    );

    this.logger.log(`Created mailbox: ${email}`, 'MailService');

    return savedMailbox;
  }

  async updateMailbox(
    mailboxId: string,
    dto: UpdateMailboxDto,
    performedBy: User,
  ): Promise<Mailbox> {
    const mailbox = await this.mailboxRepository.findOne({
      where: { id: mailboxId },
      relations: ['mailDomain'],
    });

    if (!mailbox) {
      throw new NotFoundException(`Mailbox with ID ${mailboxId} not found`);
    }

    const oldValue = { isActive: mailbox.isActive, quotaBytes: mailbox.quotaBytes };

    // Update fields
    if (dto.displayName !== undefined) mailbox.displayName = dto.displayName;
    if (dto.quotaBytes !== undefined) mailbox.quotaBytes = dto.quotaBytes;
    if (dto.isActive !== undefined) mailbox.isActive = dto.isActive;
    if (dto.forwardingEnabled !== undefined) mailbox.forwardingEnabled = dto.forwardingEnabled;
    if (dto.forwardingAddresses !== undefined) mailbox.forwardingAddresses = dto.forwardingAddresses;
    if (dto.keepLocalCopy !== undefined) mailbox.keepLocalCopy = dto.keepLocalCopy;
    if (dto.autoReplyEnabled !== undefined) mailbox.autoReplyEnabled = dto.autoReplyEnabled;
    if (dto.autoReplySubject !== undefined) mailbox.autoReplySubject = dto.autoReplySubject;
    if (dto.autoReplyMessage !== undefined) mailbox.autoReplyMessage = dto.autoReplyMessage;
    if (dto.autoReplyStartDate !== undefined) mailbox.autoReplyStartDate = dto.autoReplyStartDate;
    if (dto.autoReplyEndDate !== undefined) mailbox.autoReplyEndDate = dto.autoReplyEndDate;

    // Update password if provided
    if (dto.password) {
      await mailbox.setPassword(dto.password);
    }

    const savedMailbox = await this.mailboxRepository.save(mailbox);

    // Sync configurations
    await this.syncDovecotConfig();
    await this.syncPostfixConfig();

    await this.auditLogger.log(
      {
        operationType: AuditOperationType.UPDATE,
        resourceType: AuditResourceType.MAILBOX,
        resourceId: savedMailbox.id,
        resourceName: mailbox.email,
        description: `Updated mailbox ${mailbox.email}`,
        oldValue,
        newValue: { isActive: dto.isActive, quotaBytes: dto.quotaBytes },
      },
      { userId: performedBy.id, userEmail: performedBy.email },
    );

    return savedMailbox;
  }

  async deleteMailbox(mailboxId: string, performedBy: User): Promise<void> {
    const mailbox = await this.mailboxRepository.findOne({
      where: { id: mailboxId },
      relations: ['mailDomain'],
    });

    if (!mailbox) {
      throw new NotFoundException(`Mailbox with ID ${mailboxId} not found`);
    }

    const email = mailbox.email;
    const domainName = mailbox.mailDomain.domainName;
    const localPart = mailbox.localPart;

    // Remove maildir
    await this.dovecotService.removeMaildir(domainName, localPart);

    // Delete mailbox
    await this.mailboxRepository.remove(mailbox);

    // Sync configurations
    await this.syncDovecotConfig();
    await this.syncPostfixConfig();

    await this.auditLogger.log(
      {
        operationType: AuditOperationType.DELETE,
        resourceType: AuditResourceType.MAILBOX,
        resourceId: mailboxId,
        resourceName: email,
        description: `Deleted mailbox ${email}`,
      },
      { userId: performedBy.id, userEmail: performedBy.email },
    );

    this.logger.log(`Deleted mailbox: ${email}`, 'MailService');
  }

  async getMailbox(mailboxId: string): Promise<Mailbox> {
    const mailbox = await this.mailboxRepository.findOne({
      where: { id: mailboxId },
      relations: ['mailDomain'],
    });

    if (!mailbox) {
      throw new NotFoundException(`Mailbox with ID ${mailboxId} not found`);
    }

    // Get quota usage
    const usage = await this.dovecotService.getQuotaUsage(
      mailbox.mailDomain.domainName,
      mailbox.localPart,
    );
    mailbox.usedBytes = usage.usedBytes;

    return mailbox;
  }

  async listMailboxes(mailDomainId: string): Promise<Mailbox[]> {
    return this.mailboxRepository.find({
      where: { mailDomain: { id: mailDomainId } },
      relations: ['mailDomain'],
      order: { localPart: 'ASC' },
    });
  }

  // ==================== Mail Alias Operations ====================

  async createAlias(
    mailDomainId: string,
    dto: CreateMailAliasDto,
    performedBy: User,
  ): Promise<MailAlias> {
    const mailDomain = await this.mailDomainRepository.findOne({
      where: { id: mailDomainId },
      relations: ['aliases'],
    });

    if (!mailDomain) {
      throw new NotFoundException(`Mail domain with ID ${mailDomainId} not found`);
    }

    if (!mailDomain.enabled) {
      throw new BadRequestException(`Mail is disabled for domain ${mailDomain.domainName}`);
    }

    // Check alias limit
    if (mailDomain.maxAliases > 0 && (mailDomain.aliases?.length ?? 0) >= mailDomain.maxAliases) {
      throw new BadRequestException(
        `Maximum alias limit (${mailDomain.maxAliases}) reached for domain ${mailDomain.domainName}`,
      );
    }

    // Build source address
    const source = dto.source === '@'
      ? `@${mailDomain.domainName}`
      : `${dto.source}@${mailDomain.domainName}`;

    // Check if alias already exists
    const existing = await this.mailAliasRepository.findOne({
      where: { source },
    });

    if (existing) {
      throw new ConflictException(`Alias ${source} already exists`);
    }

    // Create alias
    const alias = this.mailAliasRepository.create({
      source,
      destinations: dto.destinations,
      type: dto.type ?? AliasType.FORWARD,
      mailDomain,
      enabled: dto.enabled ?? true,
      description: dto.description,
    });

    const savedAlias = await this.mailAliasRepository.save(alias);

    // Sync Postfix configuration
    await this.syncPostfixConfig();

    await this.auditLogger.log(
      {
        operationType: AuditOperationType.CREATE,
        resourceType: AuditResourceType.MAIL_ALIAS,
        resourceId: savedAlias.id,
        resourceName: source,
        description: `Created mail alias ${source}`,
        newValue: { source, destinations: dto.destinations, type: dto.type },
      },
      { userId: performedBy.id, userEmail: performedBy.email },
    );

    this.logger.log(`Created alias: ${source}`, 'MailService');

    return savedAlias;
  }

  async updateAlias(
    aliasId: string,
    dto: UpdateMailAliasDto,
    performedBy: User,
  ): Promise<MailAlias> {
    const alias = await this.mailAliasRepository.findOne({
      where: { id: aliasId },
      relations: ['mailDomain'],
    });

    if (!alias) {
      throw new NotFoundException(`Alias with ID ${aliasId} not found`);
    }

    const oldValue = { destinations: alias.destinations, enabled: alias.enabled };

    // Update fields
    if (dto.destinations !== undefined) alias.destinations = dto.destinations;
    if (dto.type !== undefined) alias.type = dto.type;
    if (dto.enabled !== undefined) alias.enabled = dto.enabled;
    if (dto.description !== undefined) alias.description = dto.description;

    const savedAlias = await this.mailAliasRepository.save(alias);

    // Sync Postfix configuration
    await this.syncPostfixConfig();

    await this.auditLogger.log(
      {
        operationType: AuditOperationType.UPDATE,
        resourceType: AuditResourceType.MAIL_ALIAS,
        resourceId: savedAlias.id,
        resourceName: alias.source,
        description: `Updated mail alias ${alias.source}`,
        oldValue,
        newValue: { destinations: dto.destinations, enabled: dto.enabled },
      },
      { userId: performedBy.id, userEmail: performedBy.email },
    );

    return savedAlias;
  }

  async deleteAlias(aliasId: string, performedBy: User): Promise<void> {
    const alias = await this.mailAliasRepository.findOne({
      where: { id: aliasId },
      relations: ['mailDomain'],
    });

    if (!alias) {
      throw new NotFoundException(`Alias with ID ${aliasId} not found`);
    }

    const source = alias.source;

    await this.mailAliasRepository.remove(alias);

    // Sync Postfix configuration
    await this.syncPostfixConfig();

    await this.auditLogger.log(
      {
        operationType: AuditOperationType.DELETE,
        resourceType: AuditResourceType.MAIL_ALIAS,
        resourceId: aliasId,
        resourceName: source,
        description: `Deleted mail alias ${source}`,
      },
      { userId: performedBy.id, userEmail: performedBy.email },
    );

    this.logger.log(`Deleted alias: ${source}`, 'MailService');
  }

  async listAliases(mailDomainId: string): Promise<MailAlias[]> {
    return this.mailAliasRepository.find({
      where: { mailDomain: { id: mailDomainId } },
      relations: ['mailDomain'],
      order: { source: 'ASC' },
    });
  }

  // ==================== Configuration Sync ====================

  private async syncPostfixConfig(): Promise<void> {
    try {
      // Get all enabled mail domains
      const domains = await this.mailDomainRepository.find({
        where: { enabled: true },
      });

      // Get all active mailboxes
      const mailboxes = await this.mailboxRepository.find({
        where: { isActive: true },
        relations: ['mailDomain'],
      });

      // Get all enabled aliases
      const aliases = await this.mailAliasRepository.find({
        where: { enabled: true },
        relations: ['mailDomain'],
      });

      // Get domains with catch-all enabled
      const catchAllDomains = domains.filter((d) => d.catchAllEnabled && d.catchAllAddress);

      // Write all configuration files
      await this.postfixService.writeVirtualDomainsFile(domains);
      await this.postfixService.writeVirtualMailboxesFile(mailboxes);
      await this.postfixService.writeVirtualAliasesFile(aliases, catchAllDomains);
      await this.postfixService.writeSenderLoginMapsFile(mailboxes);

      // Reload postfix
      await this.postfixService.reload();

      this.logger.log('Synced Postfix configuration', 'MailService');
    } catch (error) {
      this.logger.error('Failed to sync Postfix configuration', (error as Error).message, 'MailService');
      throw error;
    }
  }

  private async syncDovecotConfig(): Promise<void> {
    try {
      // Get all active mailboxes with their domains
      const mailboxes = await this.mailboxRepository.find({
        relations: ['mailDomain'],
      });

      // Write passwd file
      await this.dovecotService.writePasswdFile(mailboxes);

      // Reload dovecot
      await this.dovecotService.reload();

      this.logger.log('Synced Dovecot configuration', 'MailService');
    } catch (error) {
      this.logger.error('Failed to sync Dovecot configuration', (error as Error).message, 'MailService');
      throw error;
    }
  }

  // ==================== DNS Records ====================

  async getDkimDnsRecord(mailDomainId: string): Promise<{ name: string; type: string; value: string } | null> {
    const mailDomain = await this.mailDomainRepository.findOne({
      where: { id: mailDomainId },
    });

    if (!mailDomain || !mailDomain.dkimEnabled || !mailDomain.dkimPublicKey) {
      return null;
    }

    return {
      name: `${mailDomain.dkimSelector}._domainkey.${mailDomain.domainName}`,
      type: 'TXT',
      value: this.postfixService.generateDkimRecord(
        mailDomain.domainName,
        mailDomain.dkimSelector!,
        mailDomain.dkimPublicKey,
      ),
    };
  }

  async getSpfDnsRecord(mailDomainId: string, serverIp: string): Promise<{ name: string; type: string; value: string }> {
    const mailDomain = await this.mailDomainRepository.findOne({
      where: { id: mailDomainId },
    });

    if (!mailDomain) {
      throw new NotFoundException(`Mail domain with ID ${mailDomainId} not found`);
    }

    return {
      name: mailDomain.domainName,
      type: 'TXT',
      value: this.postfixService.generateSpfRecord(mailDomain.domainName, serverIp),
    };
  }

  async getDmarcDnsRecord(mailDomainId: string): Promise<{ name: string; type: string; value: string }> {
    const mailDomain = await this.mailDomainRepository.findOne({
      where: { id: mailDomainId },
    });

    if (!mailDomain) {
      throw new NotFoundException(`Mail domain with ID ${mailDomainId} not found`);
    }

    return {
      name: `_dmarc.${mailDomain.domainName}`,
      type: 'TXT',
      value: this.postfixService.generateDmarcRecord(mailDomain.domainName),
    };
  }

  // ==================== Service Status ====================

  async getMailServiceStatus(): Promise<{
    postfix: { running: boolean; enabled: boolean };
    dovecot: { running: boolean; enabled: boolean };
  }> {
    const [postfixStatus, dovecotStatus] = await Promise.all([
      this.postfixService.getServiceStatus(),
      this.dovecotService.getServiceStatus(),
    ]);

    return {
      postfix: postfixStatus,
      dovecot: dovecotStatus,
    };
  }
}
