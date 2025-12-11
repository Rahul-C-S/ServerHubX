import { Injectable } from '@nestjs/common';
import { CommandExecutorService } from '../../../core/executor/command-executor.service.js';
import { PathResolverService } from '../../../core/distro/path-resolver.service.js';
import { LoggerService } from '../../../common/logger/logger.service.js';
import { MailDomain } from '../entities/mail-domain.entity.js';
import { Mailbox } from '../entities/mailbox.entity.js';
import { MailAlias } from '../entities/mail-alias.entity.js';

export interface PostfixConfig {
  virtualDomainsFile: string;
  virtualMailboxesFile: string;
  virtualAliasesFile: string;
  senderLoginMapsFile: string;
}

@Injectable()
export class PostfixService {
  private readonly configDir: string;

  constructor(
    private readonly commandExecutor: CommandExecutorService,
    private readonly pathResolver: PathResolverService,
    private readonly logger: LoggerService,
  ) {
    this.configDir = this.pathResolver.getPostfixPaths().configDir;
  }

  getConfig(): PostfixConfig {
    return {
      virtualDomainsFile: `${this.configDir}/virtual_domains`,
      virtualMailboxesFile: `${this.configDir}/virtual_mailboxes`,
      virtualAliasesFile: `${this.configDir}/virtual_aliases`,
      senderLoginMapsFile: `${this.configDir}/sender_login_maps`,
    };
  }

  generateVirtualDomainsContent(domains: MailDomain[]): string {
    const lines: string[] = [];
    lines.push('# Virtual domains managed by ServerHubX');
    lines.push('# Do not edit manually - changes will be overwritten');
    lines.push('');

    for (const domain of domains) {
      if (domain.enabled) {
        lines.push(`${domain.domainName} OK`);
      }
    }

    return lines.join('\n') + '\n';
  }

  generateVirtualMailboxesContent(mailboxes: Mailbox[]): string {
    const lines: string[] = [];
    lines.push('# Virtual mailboxes managed by ServerHubX');
    lines.push('# Do not edit manually - changes will be overwritten');
    lines.push('');

    for (const mailbox of mailboxes) {
      if (mailbox.isActive && mailbox.mailDomain) {
        const domain = mailbox.mailDomain.domainName;
        // Format: email -> maildir path
        lines.push(`${mailbox.email} ${domain}/${mailbox.localPart}/`);
      }
    }

    return lines.join('\n') + '\n';
  }

  generateVirtualAliasesContent(aliases: MailAlias[], catchAllDomains: MailDomain[]): string {
    const lines: string[] = [];
    lines.push('# Virtual aliases managed by ServerHubX');
    lines.push('# Do not edit manually - changes will be overwritten');
    lines.push('');

    // Regular aliases
    for (const alias of aliases) {
      if (alias.enabled && alias.mailDomain && alias.destinations.length > 0) {
        const destinations = alias.destinations.join(', ');
        lines.push(`${alias.source} ${destinations}`);
      }
    }

    // Catch-all entries from domains
    for (const domain of catchAllDomains) {
      if (domain.catchAllEnabled && domain.catchAllAddress) {
        lines.push(`@${domain.domainName} ${domain.catchAllAddress}`);
      }
    }

    return lines.join('\n') + '\n';
  }

  generateSenderLoginMapsContent(mailboxes: Mailbox[]): string {
    const lines: string[] = [];
    lines.push('# Sender login maps managed by ServerHubX');
    lines.push('# Do not edit manually - changes will be overwritten');
    lines.push('');

    for (const mailbox of mailboxes) {
      if (mailbox.isActive) {
        // User can send from their own email
        lines.push(`${mailbox.email} ${mailbox.email}`);
      }
    }

    return lines.join('\n') + '\n';
  }

  async writeVirtualDomainsFile(domains: MailDomain[]): Promise<{ success: boolean; error?: string }> {
    const content = this.generateVirtualDomainsContent(domains);
    const config = this.getConfig();

    const result = await this.commandExecutor.execute('tee', [config.virtualDomainsFile], {
      stdin: content,
    });

    if (!result.success) {
      this.logger.error(`Failed to write virtual domains file: ${result.stderr}`, undefined, 'PostfixService');
      return { success: false, error: result.stderr };
    }

    // Rebuild postmap
    return this.rebuildMap(config.virtualDomainsFile);
  }

  async writeVirtualMailboxesFile(mailboxes: Mailbox[]): Promise<{ success: boolean; error?: string }> {
    const content = this.generateVirtualMailboxesContent(mailboxes);
    const config = this.getConfig();

    const result = await this.commandExecutor.execute('tee', [config.virtualMailboxesFile], {
      stdin: content,
    });

    if (!result.success) {
      this.logger.error(`Failed to write virtual mailboxes file: ${result.stderr}`, undefined, 'PostfixService');
      return { success: false, error: result.stderr };
    }

    // Rebuild postmap
    return this.rebuildMap(config.virtualMailboxesFile);
  }

  async writeVirtualAliasesFile(
    aliases: MailAlias[],
    catchAllDomains: MailDomain[],
  ): Promise<{ success: boolean; error?: string }> {
    const content = this.generateVirtualAliasesContent(aliases, catchAllDomains);
    const config = this.getConfig();

    const result = await this.commandExecutor.execute('tee', [config.virtualAliasesFile], {
      stdin: content,
    });

    if (!result.success) {
      this.logger.error(`Failed to write virtual aliases file: ${result.stderr}`, undefined, 'PostfixService');
      return { success: false, error: result.stderr };
    }

    // Rebuild postmap
    return this.rebuildMap(config.virtualAliasesFile);
  }

  async writeSenderLoginMapsFile(mailboxes: Mailbox[]): Promise<{ success: boolean; error?: string }> {
    const content = this.generateSenderLoginMapsContent(mailboxes);
    const config = this.getConfig();

    const result = await this.commandExecutor.execute('tee', [config.senderLoginMapsFile], {
      stdin: content,
    });

    if (!result.success) {
      this.logger.error(`Failed to write sender login maps file: ${result.stderr}`, undefined, 'PostfixService');
      return { success: false, error: result.stderr };
    }

    // Rebuild postmap
    return this.rebuildMap(config.senderLoginMapsFile);
  }

  async rebuildMap(mapFile: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.commandExecutor.execute('postmap', [mapFile]);

    if (!result.success) {
      this.logger.error(`Failed to rebuild postmap for ${mapFile}: ${result.stderr}`, undefined, 'PostfixService');
      return { success: false, error: result.stderr };
    }

    this.logger.log(`Rebuilt postmap: ${mapFile}`, 'PostfixService');
    return { success: true };
  }

  async rebuildAllMaps(): Promise<{ success: boolean; errors: string[] }> {
    const config = this.getConfig();
    const errors: string[] = [];

    const files = [
      config.virtualDomainsFile,
      config.virtualMailboxesFile,
      config.virtualAliasesFile,
      config.senderLoginMapsFile,
    ];

    for (const file of files) {
      const result = await this.rebuildMap(file);
      if (!result.success && result.error) {
        errors.push(result.error);
      }
    }

    return { success: errors.length === 0, errors };
  }

  async reload(): Promise<{ success: boolean; error?: string }> {
    const result = await this.commandExecutor.execute('postfix', ['reload']);

    if (!result.success) {
      this.logger.error(`Failed to reload postfix: ${result.stderr}`, undefined, 'PostfixService');
      return { success: false, error: result.stderr };
    }

    this.logger.log('Reloaded postfix', 'PostfixService');
    return { success: true };
  }

  async checkConfig(): Promise<{ valid: boolean; error?: string }> {
    const result = await this.commandExecutor.execute('postfix', ['check']);

    if (!result.success) {
      return { valid: false, error: result.stderr };
    }

    return { valid: true };
  }

  async restartService(): Promise<{ success: boolean; error?: string }> {
    const result = await this.commandExecutor.execute('systemctl', ['restart', 'postfix']);

    if (!result.success) {
      this.logger.error(`Failed to restart postfix: ${result.stderr}`, undefined, 'PostfixService');
      return { success: false, error: result.stderr };
    }

    this.logger.log('Restarted postfix', 'PostfixService');
    return { success: true };
  }

  async getServiceStatus(): Promise<{ running: boolean; enabled: boolean }> {
    const [activeResult, enabledResult] = await Promise.all([
      this.commandExecutor.execute('systemctl', ['is-active', 'postfix']),
      this.commandExecutor.execute('systemctl', ['is-enabled', 'postfix']),
    ]);

    return {
      running: activeResult.success && activeResult.stdout.trim() === 'active',
      enabled: enabledResult.success && enabledResult.stdout.trim() === 'enabled',
    };
  }

  generateDkimRecord(_domain: string, _selector: string, publicKey: string): string {
    // Strip PEM headers and newlines from public key
    const cleanKey = publicKey
      .replace(/-----BEGIN PUBLIC KEY-----/g, '')
      .replace(/-----END PUBLIC KEY-----/g, '')
      .replace(/\n/g, '')
      .trim();

    // DKIM TXT record format
    return `v=DKIM1; k=rsa; p=${cleanKey}`;
  }

  generateSpfRecord(_domain: string, serverIp: string): string {
    return `v=spf1 a mx ip4:${serverIp} ~all`;
  }

  generateDmarcRecord(domain: string, email?: string): string {
    const reportEmail = email || `postmaster@${domain}`;
    return `v=DMARC1; p=quarantine; rua=mailto:${reportEmail}; ruf=mailto:${reportEmail}; fo=1`;
  }
}
