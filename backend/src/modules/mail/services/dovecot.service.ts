import { Injectable } from '@nestjs/common';
import { CommandExecutorService } from '../../../core/executor/command-executor.service.js';
import { PathResolverService } from '../../../core/distro/path-resolver.service.js';
import { LoggerService } from '../../../common/logger/logger.service.js';
import { Mailbox } from '../entities/mailbox.entity.js';

export interface DovecotConfig {
  passwdFile: string;
  usersFile: string;
  mailDir: string;
}

@Injectable()
export class DovecotService {
  private readonly configDir: string;
  private readonly mailDir: string;

  constructor(
    private readonly commandExecutor: CommandExecutorService,
    private readonly pathResolver: PathResolverService,
    private readonly logger: LoggerService,
  ) {
    this.configDir = this.pathResolver.getDovecotPaths().configDir;
    this.mailDir = this.pathResolver.getMailDir();
  }

  getConfig(): DovecotConfig {
    return {
      passwdFile: `${this.configDir}/users`,
      usersFile: `${this.configDir}/passwd`,
      mailDir: this.mailDir,
    };
  }

  /**
   * Generate passwd-file format content for Dovecot authentication
   * Format: user:password:uid:gid:gecos:home:shell:extra_fields
   */
  generatePasswdContent(mailboxes: Mailbox[]): string {
    const lines: string[] = [];
    lines.push('# Dovecot passwd file managed by ServerHubX');
    lines.push('# Do not edit manually - changes will be overwritten');
    lines.push('# Format: user:password:uid:gid:gecos:home:shell:extra_fields');
    lines.push('');

    // Virtual mail user UID/GID (typically 5000:5000 for vmail user)
    const vmailUid = '5000';
    const vmailGid = '5000';

    for (const mailbox of mailboxes) {
      if (mailbox.isActive && mailbox.mailDomain) {
        const domain = mailbox.mailDomain.domainName;
        const mailHome = `${this.mailDir}/${domain}/${mailbox.localPart}`;

        // Extra fields for quota
        const extraFields: string[] = [];
        if (mailbox.quotaBytes > 0) {
          extraFields.push(`userdb_quota_rule=*:bytes=${mailbox.quotaBytes}`);
        }

        const extra = extraFields.join(' ');

        // Format: email:{SCHEME}password:uid:gid::mailhome::extra
        lines.push(`${mailbox.email}:${mailbox.passwordHash}:${vmailUid}:${vmailGid}::${mailHome}::${extra}`);
      }
    }

    return lines.join('\n') + '\n';
  }

  /**
   * Generate userdb file for Dovecot
   * Format: user:uid:gid:home
   */
  generateUserdbContent(mailboxes: Mailbox[]): string {
    const lines: string[] = [];
    lines.push('# Dovecot userdb file managed by ServerHubX');
    lines.push('# Do not edit manually - changes will be overwritten');
    lines.push('');

    const vmailUid = '5000';
    const vmailGid = '5000';

    for (const mailbox of mailboxes) {
      if (mailbox.isActive && mailbox.mailDomain) {
        const domain = mailbox.mailDomain.domainName;
        const mailHome = `${this.mailDir}/${domain}/${mailbox.localPart}`;

        lines.push(`${mailbox.email}:${vmailUid}:${vmailGid}:${mailHome}`);
      }
    }

    return lines.join('\n') + '\n';
  }

  async writePasswdFile(mailboxes: Mailbox[]): Promise<{ success: boolean; error?: string }> {
    const content = this.generatePasswdContent(mailboxes);
    const config = this.getConfig();

    const result = await this.commandExecutor.execute('tee', [config.passwdFile], {
      stdin: content,
    });

    if (!result.success) {
      this.logger.error(`Failed to write dovecot passwd file: ${result.stderr}`, undefined, 'DovecotService');
      return { success: false, error: result.stderr };
    }

    // Set proper permissions (should be readable only by dovecot)
    await this.commandExecutor.execute('chmod', ['640', config.passwdFile]);

    this.logger.log('Wrote dovecot passwd file', 'DovecotService');
    return { success: true };
  }

  async createMaildir(domain: string, localPart: string): Promise<{ success: boolean; error?: string }> {
    const maildirPath = `${this.mailDir}/${domain}/${localPart}`;

    // Create maildir structure: cur, new, tmp
    const result = await this.commandExecutor.execute('mkdir', ['-p', `${maildirPath}/Maildir/{cur,new,tmp}`]);

    if (!result.success) {
      this.logger.error(`Failed to create maildir: ${result.stderr}`, undefined, 'DovecotService');
      return { success: false, error: result.stderr };
    }

    // Set ownership to vmail user
    await this.commandExecutor.execute('chown', ['-R', 'vmail:vmail', maildirPath]);

    this.logger.log(`Created maildir: ${maildirPath}`, 'DovecotService');
    return { success: true };
  }

  async removeMaildir(domain: string, localPart: string): Promise<{ success: boolean; error?: string }> {
    const maildirPath = `${this.mailDir}/${domain}/${localPart}`;

    const result = await this.commandExecutor.execute('rm', ['-rf', maildirPath]);

    if (!result.success) {
      this.logger.error(`Failed to remove maildir: ${result.stderr}`, undefined, 'DovecotService');
      return { success: false, error: result.stderr };
    }

    this.logger.log(`Removed maildir: ${maildirPath}`, 'DovecotService');
    return { success: true };
  }

  async createDomainDirectory(domain: string): Promise<{ success: boolean; error?: string }> {
    const domainPath = `${this.mailDir}/${domain}`;

    const result = await this.commandExecutor.execute('mkdir', ['-p', domainPath]);

    if (!result.success) {
      this.logger.error(`Failed to create domain directory: ${result.stderr}`, undefined, 'DovecotService');
      return { success: false, error: result.stderr };
    }

    // Set ownership to vmail user
    await this.commandExecutor.execute('chown', ['vmail:vmail', domainPath]);

    this.logger.log(`Created domain directory: ${domainPath}`, 'DovecotService');
    return { success: true };
  }

  async removeDomainDirectory(domain: string): Promise<{ success: boolean; error?: string }> {
    const domainPath = `${this.mailDir}/${domain}`;

    const result = await this.commandExecutor.execute('rm', ['-rf', domainPath]);

    if (!result.success) {
      this.logger.error(`Failed to remove domain directory: ${result.stderr}`, undefined, 'DovecotService');
      return { success: false, error: result.stderr };
    }

    this.logger.log(`Removed domain directory: ${domainPath}`, 'DovecotService');
    return { success: true };
  }

  async getMaildirUsage(domain: string, localPart: string): Promise<{ bytes: number; messages: number }> {
    const maildirPath = `${this.mailDir}/${domain}/${localPart}/Maildir`;

    // Get disk usage in bytes
    const duResult = await this.commandExecutor.execute('du', ['-sb', maildirPath]);

    let bytes = 0;
    if (duResult.success) {
      const parts = duResult.stdout.trim().split('\t');
      bytes = parseInt(parts[0], 10) || 0;
    }

    // Count messages (files in cur and new directories)
    const findResult = await this.commandExecutor.execute('find', [
      `${maildirPath}/cur`,
      `${maildirPath}/new`,
      '-type',
      'f',
    ]);

    let messages = 0;
    if (findResult.success) {
      messages = findResult.stdout.trim().split('\n').filter((line) => line.length > 0).length;
    }

    return { bytes, messages };
  }

  async reload(): Promise<{ success: boolean; error?: string }> {
    const result = await this.commandExecutor.execute('systemctl', ['reload', 'dovecot']);

    if (!result.success) {
      this.logger.error(`Failed to reload dovecot: ${result.stderr}`, undefined, 'DovecotService');
      return { success: false, error: result.stderr };
    }

    this.logger.log('Reloaded dovecot', 'DovecotService');
    return { success: true };
  }

  async restartService(): Promise<{ success: boolean; error?: string }> {
    const result = await this.commandExecutor.execute('systemctl', ['restart', 'dovecot']);

    if (!result.success) {
      this.logger.error(`Failed to restart dovecot: ${result.stderr}`, undefined, 'DovecotService');
      return { success: false, error: result.stderr };
    }

    this.logger.log('Restarted dovecot', 'DovecotService');
    return { success: true };
  }

  async getServiceStatus(): Promise<{ running: boolean; enabled: boolean }> {
    const [activeResult, enabledResult] = await Promise.all([
      this.commandExecutor.execute('systemctl', ['is-active', 'dovecot']),
      this.commandExecutor.execute('systemctl', ['is-enabled', 'dovecot']),
    ]);

    return {
      running: activeResult.success && activeResult.stdout.trim() === 'active',
      enabled: enabledResult.success && enabledResult.stdout.trim() === 'enabled',
    };
  }

  /**
   * Calculate quota usage for a mailbox
   */
  async getQuotaUsage(
    domain: string,
    localPart: string,
  ): Promise<{ usedBytes: number; quotaBytes: number; usagePercent: number }> {
    const usage = await this.getMaildirUsage(domain, localPart);

    return {
      usedBytes: usage.bytes,
      quotaBytes: 0, // Will be filled from database
      usagePercent: 0, // Will be calculated from quotaBytes
    };
  }

  /**
   * Generate Sieve filter rules for auto-reply
   */
  generateAutoReplyScript(mailbox: Mailbox): string | null {
    if (!mailbox.isAutoReplyActive() || !mailbox.autoReplyMessage) {
      return null;
    }

    const lines: string[] = [];
    lines.push('require ["vacation"];');
    lines.push('');
    lines.push('vacation');
    lines.push('  :days 1');
    lines.push(`  :subject "Auto-reply: Re: \${1}"`)
    lines.push(`  "${mailbox.autoReplyMessage.replace(/"/g, '\\"')}";`);

    return lines.join('\n');
  }
}
