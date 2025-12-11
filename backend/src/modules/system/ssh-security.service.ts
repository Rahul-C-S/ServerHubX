import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { CommandExecutorService } from '../../core/executor/command-executor.service.js';
import { CsfService } from './csf.service.js';
import * as fs from 'fs/promises';

export interface SSHConfig {
  port: number;
  permitRootLogin: 'yes' | 'no' | 'prohibit-password' | 'without-password';
  passwordAuthentication: boolean;
  pubkeyAuthentication: boolean;
  maxAuthTries: number;
  loginGraceTime: number;
  x11Forwarding: boolean;
  allowTcpForwarding: boolean;
  usePAM: boolean;
}

export interface SSHSecuritySettings {
  permitRootLogin: 'yes' | 'no' | 'prohibit-password';
  passwordAuthentication: boolean;
  pubkeyAuthentication: boolean;
  maxAuthTries: number;
  loginGraceTime: number;
}

export interface SSHOperationResult {
  success: boolean;
  message: string;
  newConnectionInfo?: string;
}

@Injectable()
export class SshSecurityService {
  private readonly logger = new Logger(SshSecurityService.name);
  private readonly sshdConfigPath = '/etc/ssh/sshd_config';

  constructor(
    private readonly executor: CommandExecutorService,
    private readonly csfService: CsfService,
  ) {}

  async getSSHConfig(): Promise<SSHConfig> {
    try {
      const config = await fs.readFile(this.sshdConfigPath, 'utf-8');

      const getValue = <T>(key: string, defaultValue: T, parser?: (v: string) => T): T => {
        const regex = new RegExp(`^\\s*${key}\\s+(.+)`, 'im');
        const match = config.match(regex);
        if (!match) return defaultValue;
        const value = match[1].trim();
        return parser ? parser(value) : (value as unknown as T);
      };

      const parseBoolean = (v: string): boolean => v.toLowerCase() === 'yes';
      const parseInt10 = (v: string): number => parseInt(v, 10) || 0;

      return {
        port: getValue('Port', 22, parseInt10),
        permitRootLogin: getValue('PermitRootLogin', 'prohibit-password') as SSHConfig['permitRootLogin'],
        passwordAuthentication: getValue('PasswordAuthentication', true, parseBoolean),
        pubkeyAuthentication: getValue('PubkeyAuthentication', true, parseBoolean),
        maxAuthTries: getValue('MaxAuthTries', 6, parseInt10),
        loginGraceTime: getValue('LoginGraceTime', 120, parseInt10),
        x11Forwarding: getValue('X11Forwarding', false, parseBoolean),
        allowTcpForwarding: getValue('AllowTcpForwarding', true, parseBoolean),
        usePAM: getValue('UsePAM', true, parseBoolean),
      };
    } catch (error) {
      this.logger.error(`Failed to read SSH config: ${error}`);
      throw new BadRequestException('Failed to read SSH configuration');
    }
  }

  async getSSHPort(): Promise<number> {
    const config = await this.getSSHConfig();
    return config.port;
  }

  async changeSSHPort(newPort: number): Promise<SSHOperationResult> {
    // Validate port range
    if (newPort < 1 || newPort > 65535) {
      return { success: false, message: 'Port must be between 1 and 65535' };
    }

    // Recommended to use ports > 1024 for non-root
    if (newPort < 1024 && newPort !== 22) {
      this.logger.warn(`Using privileged port ${newPort} for SSH`);
    }

    try {
      // Check if port is in use
      const portCheck = await this.executor.execute('ss', ['-tlnp']);
      if (portCheck.stdout.includes(`:${newPort} `)) {
        return { success: false, message: `Port ${newPort} is already in use` };
      }

      const currentPort = await this.getSSHPort();

      // Backup sshd_config
      const backupPath = `/tmp/sshd_config.backup.${Date.now()}`;
      await this.executor.executeSudo('cp', [this.sshdConfigPath, backupPath]);

      // Read and modify config
      let config = await fs.readFile(this.sshdConfigPath, 'utf-8');

      // Update or add Port directive
      if (config.match(/^\s*Port\s+\d+/m)) {
        config = config.replace(/^\s*Port\s+\d+/m, `Port ${newPort}`);
      } else {
        // Add Port directive at the beginning
        config = `Port ${newPort}\n${config}`;
      }

      // Write updated config
      const tempPath = `/tmp/sshd_config.${Date.now()}`;
      await fs.writeFile(tempPath, config);
      await this.executor.executeSudo('cp', [tempPath, this.sshdConfigPath]);
      await fs.unlink(tempPath);

      // Validate sshd config
      const validateResult = await this.executor.executeSudo('sshd', ['-t']);
      if (validateResult.exitCode !== 0) {
        // Restore backup
        await this.executor.executeSudo('cp', [backupPath, this.sshdConfigPath]);
        await fs.unlink(backupPath);
        return { success: false, message: 'Invalid SSH configuration. Changes reverted.' };
      }

      // Update CSF to allow new port
      await this.csfService.allowPort({
        port: newPort,
        protocol: 'TCP' as any,
        direction: 'BOTH' as any,
        comment: 'SSH port',
      });

      // Remove old port from CSF if different
      if (currentPort !== newPort && currentPort !== 22) {
        await this.csfService.denyPort(currentPort);
      }

      // Restart CSF
      await this.csfService.restart();

      // Restart sshd
      await this.executor.executeSudo('systemctl', ['restart', 'sshd']);

      // Clean up backup
      await fs.unlink(backupPath);

      const hostname = await this.getHostname();
      const connectionInfo = `ssh -p ${newPort} user@${hostname}`;

      this.logger.log(`SSH port changed from ${currentPort} to ${newPort}`);

      return {
        success: true,
        message: `SSH port changed to ${newPort}. New connection command: ${connectionInfo}`,
        newConnectionInfo: connectionInfo,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to change SSH port: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async getSSHSecuritySettings(): Promise<SSHSecuritySettings> {
    const config = await this.getSSHConfig();
    return {
      permitRootLogin: config.permitRootLogin as SSHSecuritySettings['permitRootLogin'],
      passwordAuthentication: config.passwordAuthentication,
      pubkeyAuthentication: config.pubkeyAuthentication,
      maxAuthTries: config.maxAuthTries,
      loginGraceTime: config.loginGraceTime,
    };
  }

  async updateSSHSecuritySettings(settings: Partial<SSHSecuritySettings>): Promise<SSHOperationResult> {
    try {
      // Backup sshd_config
      const backupPath = `/tmp/sshd_config.backup.${Date.now()}`;
      await this.executor.executeSudo('cp', [this.sshdConfigPath, backupPath]);

      let config = await fs.readFile(this.sshdConfigPath, 'utf-8');

      const updateSetting = (key: string, value: string | number | boolean | undefined): void => {
        if (value === undefined) return;

        const stringValue = typeof value === 'boolean' ? (value ? 'yes' : 'no') : String(value);
        const regex = new RegExp(`^(\\s*#?\\s*${key}\\s+).*$`, 'im');

        if (config.match(regex)) {
          config = config.replace(regex, `${key} ${stringValue}`);
        } else {
          // Add new setting
          config += `\n${key} ${stringValue}`;
        }
      };

      if (settings.permitRootLogin !== undefined) {
        updateSetting('PermitRootLogin', settings.permitRootLogin);
      }
      if (settings.passwordAuthentication !== undefined) {
        updateSetting('PasswordAuthentication', settings.passwordAuthentication);
      }
      if (settings.pubkeyAuthentication !== undefined) {
        updateSetting('PubkeyAuthentication', settings.pubkeyAuthentication);
      }
      if (settings.maxAuthTries !== undefined) {
        updateSetting('MaxAuthTries', settings.maxAuthTries);
      }
      if (settings.loginGraceTime !== undefined) {
        updateSetting('LoginGraceTime', settings.loginGraceTime);
      }

      // Write updated config
      const tempPath = `/tmp/sshd_config.${Date.now()}`;
      await fs.writeFile(tempPath, config);
      await this.executor.executeSudo('cp', [tempPath, this.sshdConfigPath]);
      await fs.unlink(tempPath);

      // Validate sshd config
      const validateResult = await this.executor.executeSudo('sshd', ['-t']);
      if (validateResult.exitCode !== 0) {
        // Restore backup
        await this.executor.executeSudo('cp', [backupPath, this.sshdConfigPath]);
        await fs.unlink(backupPath);
        return { success: false, message: 'Invalid SSH configuration. Changes reverted.' };
      }

      // Restart sshd
      await this.executor.executeSudo('systemctl', ['restart', 'sshd']);

      // Clean up backup
      await fs.unlink(backupPath);

      this.logger.log('SSH security settings updated');

      return {
        success: true,
        message: 'SSH security settings updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update SSH settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async getConnectionInfo(): Promise<{ hostname: string; port: number; command: string }> {
    const hostname = await this.getHostname();
    const port = await this.getSSHPort();
    const command = port === 22 ? `ssh user@${hostname}` : `ssh -p ${port} user@${hostname}`;

    return { hostname, port, command };
  }

  private async getHostname(): Promise<string> {
    try {
      const result = await this.executor.execute('hostname', ['-f']);
      return result.stdout.trim() || 'server';
    } catch {
      return 'server';
    }
  }

  async validateSSHConfig(): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const result = await this.executor.executeSudo('sshd', ['-t']);
      if (result.exitCode === 0) {
        return { valid: true, errors: [] };
      }
      return { valid: false, errors: [result.stderr || 'Unknown configuration error'] };
    } catch (error) {
      return { valid: false, errors: [(error as Error).message] };
    }
  }

  async restartSSHD(): Promise<SSHOperationResult> {
    try {
      // Validate config first
      const validation = await this.validateSSHConfig();
      if (!validation.valid) {
        return { success: false, message: `Invalid SSH config: ${validation.errors.join(', ')}` };
      }

      await this.executor.executeSudo('systemctl', ['restart', 'sshd']);
      this.logger.log('SSHD restarted');
      return { success: true, message: 'SSH daemon restarted successfully' };
    } catch (error) {
      return {
        success: false,
        message: `Failed to restart SSHD: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
