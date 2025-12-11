import { Injectable, Logger } from '@nestjs/common';
import { CommandExecutorService } from '../../core/executor/command-executor.service.js';
import { PathResolverService } from '../../core/distro/path-resolver.service.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface LFDStatus {
  isRunning: boolean;
  isEnabled: boolean;
}

export interface LFDSettings {
  loginFailureTrigger: number;
  loginFailureInterval: number;
  sshFailureLimit: number;
  ftpFailureLimit: number;
  smtpAuthFailureLimit: number;
  imapFailureLimit: number;
  pop3FailureLimit: number;
  htaccessFailureLimit: number;
  modsecFailureLimit: number;
  directAdminFailureLimit: number;
}

export interface LFDBlockedLogin {
  ip: string;
  service: string;
  blockedAt: Date;
  reason: string;
}

export interface LFDOperationResult {
  success: boolean;
  message: string;
}

@Injectable()
export class CsfLfdService {
  private readonly logger = new Logger(CsfLfdService.name);

  constructor(
    private readonly executor: CommandExecutorService,
    private readonly pathResolver: PathResolverService,
  ) {}

  async getStatus(): Promise<LFDStatus> {
    try {
      const isActiveResult = await this.executor.execute('systemctl', ['is-active', 'lfd']);
      const isRunning = isActiveResult.stdout.trim() === 'active';

      const isEnabledResult = await this.executor.execute('systemctl', ['is-enabled', 'lfd']);
      const isEnabled = isEnabledResult.stdout.trim() === 'enabled';

      return { isRunning, isEnabled };
    } catch {
      return { isRunning: false, isEnabled: false };
    }
  }

  async getSettings(): Promise<LFDSettings> {
    try {
      const csfPaths = this.pathResolver.getCSFPaths();
      const configPath = path.join(csfPaths.configDir, 'csf.conf');
      const config = await fs.readFile(configPath, 'utf-8');

      const getValue = (key: string, defaultValue: number): number => {
        const match = config.match(new RegExp(`^${key}\\s*=\\s*["']?(\\d+)["']?`, 'm'));
        return match ? parseInt(match[1], 10) : defaultValue;
      };

      return {
        loginFailureTrigger: getValue('LF_TRIGGER', 10),
        loginFailureInterval: getValue('LF_INTERVAL', 3600),
        sshFailureLimit: getValue('LF_SSHD', 5),
        ftpFailureLimit: getValue('LF_FTPD', 10),
        smtpAuthFailureLimit: getValue('LF_SMTPAUTH', 5),
        imapFailureLimit: getValue('LF_IMAPD', 10),
        pop3FailureLimit: getValue('LF_POP3D', 10),
        htaccessFailureLimit: getValue('LF_HTACCESS', 5),
        modsecFailureLimit: getValue('LF_MODSEC', 5),
        directAdminFailureLimit: getValue('LF_DIRECTADMIN', 5),
      };
    } catch {
      return {
        loginFailureTrigger: 10,
        loginFailureInterval: 3600,
        sshFailureLimit: 5,
        ftpFailureLimit: 10,
        smtpAuthFailureLimit: 5,
        imapFailureLimit: 10,
        pop3FailureLimit: 10,
        htaccessFailureLimit: 5,
        modsecFailureLimit: 5,
        directAdminFailureLimit: 5,
      };
    }
  }

  async updateSettings(settings: Partial<LFDSettings>): Promise<LFDOperationResult> {
    try {
      const csfPaths = this.pathResolver.getCSFPaths();
      const configPath = path.join(csfPaths.configDir, 'csf.conf');
      let config = await fs.readFile(configPath, 'utf-8');

      const updateValue = (key: string, value: number | undefined): void => {
        if (value === undefined) return;
        const regex = new RegExp(`^(${key}\\s*=\\s*)["']?\\d+["']?`, 'm');
        if (config.match(regex)) {
          config = config.replace(regex, `$1"${value}"`);
        }
      };

      const keyMap: Record<keyof LFDSettings, string> = {
        loginFailureTrigger: 'LF_TRIGGER',
        loginFailureInterval: 'LF_INTERVAL',
        sshFailureLimit: 'LF_SSHD',
        ftpFailureLimit: 'LF_FTPD',
        smtpAuthFailureLimit: 'LF_SMTPAUTH',
        imapFailureLimit: 'LF_IMAPD',
        pop3FailureLimit: 'LF_POP3D',
        htaccessFailureLimit: 'LF_HTACCESS',
        modsecFailureLimit: 'LF_MODSEC',
        directAdminFailureLimit: 'LF_DIRECTADMIN',
      };

      for (const [settingKey, configKey] of Object.entries(keyMap)) {
        const value = settings[settingKey as keyof LFDSettings];
        updateValue(configKey, value);
      }

      const tempPath = `/tmp/csf.conf.${Date.now()}`;
      await fs.writeFile(tempPath, config);
      await this.executor.executeSudo('cp', [tempPath, configPath]);
      await fs.unlink(tempPath);

      // Restart LFD to apply changes
      await this.restart();

      this.logger.log('LFD settings updated');
      return { success: true, message: 'LFD settings updated successfully' };
    } catch (error) {
      return { success: false, message: `Failed to update LFD settings: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async setLoginFailureLimit(service: string, limit: number): Promise<LFDOperationResult> {
    const serviceKeyMap: Record<string, keyof LFDSettings> = {
      ssh: 'sshFailureLimit',
      ftp: 'ftpFailureLimit',
      smtp: 'smtpAuthFailureLimit',
      imap: 'imapFailureLimit',
      pop3: 'pop3FailureLimit',
      htaccess: 'htaccessFailureLimit',
      modsec: 'modsecFailureLimit',
    };

    const key = serviceKeyMap[service.toLowerCase()];
    if (!key) {
      return { success: false, message: `Unknown service: ${service}` };
    }

    return this.updateSettings({ [key]: limit });
  }

  async setBlockTime(seconds: number): Promise<LFDOperationResult> {
    return this.updateSettings({ loginFailureInterval: seconds });
  }

  async ignoreIp(ip: string, comment?: string): Promise<LFDOperationResult> {
    try {
      const csfPaths = this.pathResolver.getCSFPaths();
      const ignoreFile = path.join(csfPaths.configDir, 'csf.ignore');

      let content = '';
      try {
        content = await fs.readFile(ignoreFile, 'utf-8');
      } catch {
        // File may not exist
      }

      const lines = content.split('\n');
      const existingLine = lines.find(line => line.trim().startsWith(ip));
      if (existingLine) {
        return { success: true, message: `IP ${ip} is already in ignore list` };
      }

      const newLine = comment ? `${ip} # ${comment}` : ip;
      lines.push(newLine);

      const tempPath = `/tmp/csf.ignore.${Date.now()}`;
      await fs.writeFile(tempPath, lines.join('\n'));
      await this.executor.executeSudo('cp', [tempPath, ignoreFile]);
      await fs.unlink(tempPath);

      // Restart LFD to apply changes
      await this.restart();

      this.logger.log(`IP ${ip} added to LFD ignore list`);
      return { success: true, message: `IP ${ip} added to ignore list` };
    } catch (error) {
      return { success: false, message: `Failed to add IP to ignore list: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async removeIgnoredIp(ip: string): Promise<LFDOperationResult> {
    try {
      const csfPaths = this.pathResolver.getCSFPaths();
      const ignoreFile = path.join(csfPaths.configDir, 'csf.ignore');

      let content = '';
      try {
        content = await fs.readFile(ignoreFile, 'utf-8');
      } catch {
        return { success: false, message: 'Ignore file not found' };
      }

      const lines = content.split('\n');
      const filteredLines = lines.filter(line => !line.trim().startsWith(ip));

      if (lines.length === filteredLines.length) {
        return { success: true, message: `IP ${ip} was not in ignore list` };
      }

      const tempPath = `/tmp/csf.ignore.${Date.now()}`;
      await fs.writeFile(tempPath, filteredLines.join('\n'));
      await this.executor.executeSudo('cp', [tempPath, ignoreFile]);
      await fs.unlink(tempPath);

      await this.restart();

      this.logger.log(`IP ${ip} removed from LFD ignore list`);
      return { success: true, message: `IP ${ip} removed from ignore list` };
    } catch (error) {
      return { success: false, message: `Failed to remove IP from ignore list: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async listIgnoredIps(): Promise<{ ip: string; comment?: string }[]> {
    try {
      const csfPaths = this.pathResolver.getCSFPaths();
      const ignoreFile = path.join(csfPaths.configDir, 'csf.ignore');
      const content = await fs.readFile(ignoreFile, 'utf-8');
      const entries: { ip: string; comment?: string }[] = [];

      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const match = trimmed.match(/^([\d.:a-f]+(?:\/\d+)?)\s*(?:#\s*(.*))?$/i);
        if (match) {
          entries.push({
            ip: match[1],
            comment: match[2] || undefined,
          });
        }
      }

      return entries;
    } catch {
      return [];
    }
  }

  async getBlockedLogins(): Promise<LFDBlockedLogin[]> {
    try {
      // Parse /var/log/lfd.log for recent blocks
      // This is a simplified implementation
      const logPath = '/var/log/lfd.log';
      let content = '';
      try {
        content = await fs.readFile(logPath, 'utf-8');
      } catch {
        return [];
      }

      const entries: LFDBlockedLogin[] = [];
      const lines = content.split('\n').slice(-1000); // Last 1000 lines

      for (const line of lines) {
        // Parse LFD log format: "Mon Dec 11 12:00:00 2023 (service) Blocked IP: 1.2.3.4"
        const blockMatch = line.match(/(\w+ \w+ \d+ \d+:\d+:\d+ \d+) \((\w+)\) Blocked.*?(\d+\.\d+\.\d+\.\d+)/i);
        if (blockMatch) {
          entries.push({
            ip: blockMatch[3],
            service: blockMatch[2],
            blockedAt: new Date(blockMatch[1]),
            reason: 'Login failure limit exceeded',
          });
        }
      }

      return entries.slice(-100); // Return last 100 blocks
    } catch {
      return [];
    }
  }

  async start(): Promise<LFDOperationResult> {
    try {
      await this.executor.executeSudo('systemctl', ['start', 'lfd']);
      this.logger.log('LFD started');
      return { success: true, message: 'LFD started successfully' };
    } catch (error) {
      return { success: false, message: `Failed to start LFD: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async stop(): Promise<LFDOperationResult> {
    try {
      await this.executor.executeSudo('systemctl', ['stop', 'lfd']);
      this.logger.log('LFD stopped');
      return { success: true, message: 'LFD stopped successfully' };
    } catch (error) {
      return { success: false, message: `Failed to stop LFD: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async restart(): Promise<LFDOperationResult> {
    try {
      await this.executor.executeSudo('systemctl', ['restart', 'lfd']);
      this.logger.log('LFD restarted');
      return { success: true, message: 'LFD restarted successfully' };
    } catch (error) {
      return { success: false, message: `Failed to restart LFD: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }
}
