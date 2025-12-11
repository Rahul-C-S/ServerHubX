import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { CommandExecutorService } from '../../core/executor/command-executor.service.js';
import { PathResolverService } from '../../core/distro/path-resolver.service.js';
import { FirewallRule, FirewallRuleType, FirewallProtocol, FirewallDirection } from './entities/firewall-rule.entity.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface CSFStatus {
  isRunning: boolean;
  isEnabled: boolean;
  version: string | null;
  testingMode: boolean;
}

export interface PortConfig {
  port: number;
  protocol: FirewallProtocol;
  direction: FirewallDirection;
  comment?: string;
}

export interface IPEntry {
  ip: string;
  comment?: string;
  addedAt?: Date;
  expiresAt?: Date;
}

export interface CSFOperationResult {
  success: boolean;
  message: string;
}

@Injectable()
export class CsfService {
  private readonly logger = new Logger(CsfService.name);

  constructor(
    @InjectRepository(FirewallRule)
    private readonly firewallRuleRepo: Repository<FirewallRule>,
    private readonly executor: CommandExecutorService,
    private readonly pathResolver: PathResolverService,
  ) {}

  async getStatus(): Promise<CSFStatus> {
    try {
      const csfListResult = await this.executor.executeSudo('csf', ['-l']);
      const isRunning = csfListResult.exitCode === 0;

      const csfEnabledResult = await this.executor.execute('systemctl', ['is-enabled', 'csf']);
      const isEnabled = csfEnabledResult.stdout.trim() === 'enabled';

      const versionResult = await this.executor.execute('csf', ['--version']);
      const versionMatch = versionResult.stdout.match(/csf v([\d.]+)/);
      const version = versionMatch ? versionMatch[1] : null;

      const testingMode = await this.isTestingModeEnabled();

      return { isRunning, isEnabled, version, testingMode };
    } catch {
      return { isRunning: false, isEnabled: false, version: null, testingMode: false };
    }
  }

  private async isTestingModeEnabled(): Promise<boolean> {
    try {
      const csfPaths = this.pathResolver.getCSFPaths();
      const configPath = path.join(csfPaths.configDir, 'csf.conf');
      const config = await fs.readFile(configPath, 'utf-8');
      const match = config.match(/^TESTING\s*=\s*["']?(\d)["']?/m);
      return match ? match[1] === '1' : false;
    } catch {
      return false;
    }
  }

  async getAllowedPorts(): Promise<{ tcpIn: number[]; tcpOut: number[]; udpIn: number[]; udpOut: number[] }> {
    try {
      const csfPaths = this.pathResolver.getCSFPaths();
      const configPath = path.join(csfPaths.configDir, 'csf.conf');
      const config = await fs.readFile(configPath, 'utf-8');

      const parsePortList = (key: string): number[] => {
        const match = config.match(new RegExp(`^${key}\\s*=\\s*["']([^"']*)["']`, 'm'));
        if (!match) return [];
        return match[1].split(',').map(p => parseInt(p.trim(), 10)).filter(p => !isNaN(p));
      };

      return {
        tcpIn: parsePortList('TCP_IN'),
        tcpOut: parsePortList('TCP_OUT'),
        udpIn: parsePortList('UDP_IN'),
        udpOut: parsePortList('UDP_OUT'),
      };
    } catch {
      return { tcpIn: [], tcpOut: [], udpIn: [], udpOut: [] };
    }
  }

  async allowPort(config: PortConfig, createdBy?: string): Promise<CSFOperationResult> {
    try {
      const csfPaths = this.pathResolver.getCSFPaths();
      const configPath = path.join(csfPaths.configDir, 'csf.conf');
      let csfConfig = await fs.readFile(configPath, 'utf-8');

      const addPortToList = (key: string, port: number): string => {
        const regex = new RegExp(`^(${key}\\s*=\\s*["'])([^"']*)["']`, 'm');
        const match = csfConfig.match(regex);
        if (!match) return csfConfig;

        const ports = match[2].split(',').map(p => p.trim()).filter(p => p);
        if (!ports.includes(port.toString())) {
          ports.push(port.toString());
        }
        return csfConfig.replace(regex, `$1${ports.join(',')}"`);
      };

      const protocol = config.protocol;
      const direction = config.direction;

      if (protocol === FirewallProtocol.TCP || protocol === FirewallProtocol.BOTH) {
        if (direction === FirewallDirection.IN || direction === FirewallDirection.BOTH) {
          csfConfig = addPortToList('TCP_IN', config.port);
        }
        if (direction === FirewallDirection.OUT || direction === FirewallDirection.BOTH) {
          csfConfig = addPortToList('TCP_OUT', config.port);
        }
      }

      if (protocol === FirewallProtocol.UDP || protocol === FirewallProtocol.BOTH) {
        if (direction === FirewallDirection.IN || direction === FirewallDirection.BOTH) {
          csfConfig = addPortToList('UDP_IN', config.port);
        }
        if (direction === FirewallDirection.OUT || direction === FirewallDirection.BOTH) {
          csfConfig = addPortToList('UDP_OUT', config.port);
        }
      }

      const tempPath = `/tmp/csf.conf.${Date.now()}`;
      await fs.writeFile(tempPath, csfConfig);
      await this.executor.executeSudo('cp', [tempPath, configPath]);
      await fs.unlink(tempPath);

      // Save to database
      const rule = this.firewallRuleRepo.create({
        type: FirewallRuleType.PORT_ALLOW,
        port: config.port,
        protocol: config.protocol,
        direction: config.direction,
        comment: config.comment,
        createdBy,
        enabled: true,
      });
      await this.firewallRuleRepo.save(rule);

      await this.reload();

      this.logger.log(`Port ${config.port} allowed`);
      return { success: true, message: `Port ${config.port} allowed successfully` };
    } catch (error) {
      return { success: false, message: `Failed to allow port: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async denyPort(port: number, protocol: FirewallProtocol = FirewallProtocol.TCP, direction: FirewallDirection = FirewallDirection.BOTH): Promise<CSFOperationResult> {
    try {
      const csfPaths = this.pathResolver.getCSFPaths();
      const configPath = path.join(csfPaths.configDir, 'csf.conf');
      let csfConfig = await fs.readFile(configPath, 'utf-8');

      const removePortFromList = (key: string, portToRemove: number): string => {
        const regex = new RegExp(`^(${key}\\s*=\\s*["'])([^"']*)["']`, 'm');
        const match = csfConfig.match(regex);
        if (!match) return csfConfig;

        const ports = match[2].split(',').map(p => p.trim()).filter(p => p && p !== portToRemove.toString());
        return csfConfig.replace(regex, `$1${ports.join(',')}"`);
      };

      if (protocol === FirewallProtocol.TCP || protocol === FirewallProtocol.BOTH) {
        if (direction === FirewallDirection.IN || direction === FirewallDirection.BOTH) {
          csfConfig = removePortFromList('TCP_IN', port);
        }
        if (direction === FirewallDirection.OUT || direction === FirewallDirection.BOTH) {
          csfConfig = removePortFromList('TCP_OUT', port);
        }
      }

      if (protocol === FirewallProtocol.UDP || protocol === FirewallProtocol.BOTH) {
        if (direction === FirewallDirection.IN || direction === FirewallDirection.BOTH) {
          csfConfig = removePortFromList('UDP_IN', port);
        }
        if (direction === FirewallDirection.OUT || direction === FirewallDirection.BOTH) {
          csfConfig = removePortFromList('UDP_OUT', port);
        }
      }

      const tempPath = `/tmp/csf.conf.${Date.now()}`;
      await fs.writeFile(tempPath, csfConfig);
      await this.executor.executeSudo('cp', [tempPath, configPath]);
      await fs.unlink(tempPath);

      // Remove from database
      await this.firewallRuleRepo.delete({ port, type: FirewallRuleType.PORT_ALLOW });

      await this.reload();

      this.logger.log(`Port ${port} denied`);
      return { success: true, message: `Port ${port} denied successfully` };
    } catch (error) {
      return { success: false, message: `Failed to deny port: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async allowIp(ip: string, comment?: string, createdBy?: string): Promise<CSFOperationResult> {
    try {
      const csfPaths = this.pathResolver.getCSFPaths();
      const allowFile = csfPaths.allowFile;

      let content = '';
      try {
        content = await fs.readFile(allowFile, 'utf-8');
      } catch {
        // File may not exist
      }

      const lines = content.split('\n');
      const existingLine = lines.find(line => line.trim().startsWith(ip));
      if (existingLine) {
        return { success: true, message: `IP ${ip} is already in allow list` };
      }

      const newLine = comment ? `${ip} # ${comment}` : ip;
      lines.push(newLine);

      const tempPath = `/tmp/csf.allow.${Date.now()}`;
      await fs.writeFile(tempPath, lines.join('\n'));
      await this.executor.executeSudo('cp', [tempPath, allowFile]);
      await fs.unlink(tempPath);

      // Save to database
      const rule = this.firewallRuleRepo.create({
        type: FirewallRuleType.IP_ALLOW,
        ipAddress: ip,
        comment,
        createdBy,
        enabled: true,
      });
      await this.firewallRuleRepo.save(rule);

      await this.reload();

      this.logger.log(`IP ${ip} added to allow list`);
      return { success: true, message: `IP ${ip} allowed successfully` };
    } catch (error) {
      return { success: false, message: `Failed to allow IP: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async blockIp(ip: string, comment?: string, createdBy?: string): Promise<CSFOperationResult> {
    try {
      await this.executor.executeSudo('csf', ['-d', ip, comment || 'Blocked via ServerHubX']);

      // Save to database
      const rule = this.firewallRuleRepo.create({
        type: FirewallRuleType.IP_DENY,
        ipAddress: ip,
        comment,
        createdBy,
        enabled: true,
      });
      await this.firewallRuleRepo.save(rule);

      this.logger.log(`IP ${ip} blocked`);
      return { success: true, message: `IP ${ip} blocked successfully` };
    } catch (error) {
      return { success: false, message: `Failed to block IP: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async tempBlockIp(ip: string, ttlSeconds: number, comment?: string, createdBy?: string): Promise<CSFOperationResult> {
    try {
      const args = ['-td', ip, ttlSeconds.toString()];
      if (comment) {
        args.push(comment);
      }
      await this.executor.executeSudo('csf', args);

      // Save to database
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
      const rule = this.firewallRuleRepo.create({
        type: FirewallRuleType.IP_TEMP_BLOCK,
        ipAddress: ip,
        comment,
        createdBy,
        enabled: true,
        expiresAt,
      });
      await this.firewallRuleRepo.save(rule);

      this.logger.log(`IP ${ip} temporarily blocked for ${ttlSeconds} seconds`);
      return { success: true, message: `IP ${ip} temporarily blocked for ${ttlSeconds} seconds` };
    } catch (error) {
      return { success: false, message: `Failed to temp block IP: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async tempAllowIp(ip: string, ttlSeconds: number, comment?: string): Promise<CSFOperationResult> {
    try {
      const args = ['-ta', ip, ttlSeconds.toString()];
      if (comment) {
        args.push(comment);
      }
      await this.executor.executeSudo('csf', args);

      this.logger.log(`IP ${ip} temporarily allowed for ${ttlSeconds} seconds`);
      return { success: true, message: `IP ${ip} temporarily allowed for ${ttlSeconds} seconds` };
    } catch (error) {
      return { success: false, message: `Failed to temp allow IP: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async unblockIp(ip: string): Promise<CSFOperationResult> {
    try {
      // Remove from permanent deny list
      await this.executor.executeSudo('csf', ['-dr', ip]);

      // Also try to remove from temp blocks
      try {
        await this.executor.executeSudo('csf', ['-tr', ip]);
      } catch {
        // May not be in temp list
      }

      // Remove from database
      await this.firewallRuleRepo.delete({ ipAddress: ip, type: FirewallRuleType.IP_DENY });
      await this.firewallRuleRepo.delete({ ipAddress: ip, type: FirewallRuleType.IP_TEMP_BLOCK });

      this.logger.log(`IP ${ip} unblocked`);
      return { success: true, message: `IP ${ip} unblocked successfully` };
    } catch (error) {
      return { success: false, message: `Failed to unblock IP: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async removeFromAllowList(ip: string): Promise<CSFOperationResult> {
    try {
      await this.executor.executeSudo('csf', ['-ar', ip]);

      // Remove from database
      await this.firewallRuleRepo.delete({ ipAddress: ip, type: FirewallRuleType.IP_ALLOW });

      this.logger.log(`IP ${ip} removed from allow list`);
      return { success: true, message: `IP ${ip} removed from allow list` };
    } catch (error) {
      return { success: false, message: `Failed to remove IP from allow list: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async listBlockedIps(): Promise<IPEntry[]> {
    try {
      const csfPaths = this.pathResolver.getCSFPaths();
      const denyFile = csfPaths.denyFile;
      const content = await fs.readFile(denyFile, 'utf-8');
      const entries: IPEntry[] = [];

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

  async listAllowedIps(): Promise<IPEntry[]> {
    try {
      const csfPaths = this.pathResolver.getCSFPaths();
      const allowFile = csfPaths.allowFile;
      const content = await fs.readFile(allowFile, 'utf-8');
      const entries: IPEntry[] = [];

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

  async listTempBlocks(): Promise<IPEntry[]> {
    try {
      const result = await this.executor.executeSudo('csf', ['-t']);
      const entries: IPEntry[] = [];

      // Parse csf -t output
      const lines = result.stdout.split('\n');
      for (const line of lines) {
        const match = line.match(/(\d+\.\d+\.\d+\.\d+)\s+\|\s+\d+\s+\|\s+(\d+)\s+\|/);
        if (match) {
          const remainingSeconds = parseInt(match[2], 10);
          entries.push({
            ip: match[1],
            expiresAt: new Date(Date.now() + remainingSeconds * 1000),
          });
        }
      }

      return entries;
    } catch {
      return [];
    }
  }

  async restart(): Promise<CSFOperationResult> {
    try {
      await this.executor.executeSudo('csf', ['-r']);
      this.logger.log('CSF restarted');
      return { success: true, message: 'CSF restarted successfully' };
    } catch (error) {
      return { success: false, message: `Failed to restart CSF: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async reload(): Promise<CSFOperationResult> {
    try {
      await this.executor.executeSudo('csf', ['-q']);
      this.logger.log('CSF reloaded (quick restart)');
      return { success: true, message: 'CSF reloaded successfully' };
    } catch (error) {
      return { success: false, message: `Failed to reload CSF: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async getFirewallRules(): Promise<FirewallRule[]> {
    return this.firewallRuleRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async cleanupExpiredTempBlocks(): Promise<void> {
    const now = new Date();
    await this.firewallRuleRepo.delete({
      type: FirewallRuleType.IP_TEMP_BLOCK,
      expiresAt: LessThan(now),
    });
  }
}
