import { Injectable, Logger } from '@nestjs/common';
import { CommandExecutorService } from '../../core/executor/command-executor.service.js';
import { DistroDetectorService } from '../../core/distro/distro-detector.service.js';
import * as os from 'os';

export interface OsInfo {
  platform: string;
  distro: string;
  distroVersion: string;
  kernel: string;
  arch: string;
  hostname: string;
}

export interface SystemUptime {
  seconds: number;
  formatted: string;
  bootTime: Date;
}

export interface ServiceStatus {
  name: string;
  displayName: string;
  status: 'running' | 'stopped' | 'failed' | 'unknown';
  enabled: boolean;
  memory?: number;
  cpu?: number;
}

export interface PackageUpdate {
  name: string;
  currentVersion: string;
  availableVersion: string;
  type: 'security' | 'regular';
}

export interface InstalledVersion {
  version: string;
  default?: boolean;
}

@Injectable()
export class SystemInfoService {
  private readonly logger = new Logger(SystemInfoService.name);

  constructor(
    private readonly executor: CommandExecutorService,
    private readonly distroDetector: DistroDetectorService,
  ) {}

  async getOsInfo(): Promise<OsInfo> {
    const distroInfo = this.distroDetector.getDistroInfo();

    return {
      platform: os.platform(),
      distro: distroInfo.name,
      distroVersion: distroInfo.version,
      kernel: os.release(),
      arch: os.arch(),
      hostname: os.hostname(),
    };
  }

  async getUptime(): Promise<SystemUptime> {
    const uptimeSeconds = os.uptime();
    const bootTime = new Date(Date.now() - uptimeSeconds * 1000);

    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);

    let formatted = '';
    if (days > 0) formatted += `${days}d `;
    if (hours > 0 || days > 0) formatted += `${hours}h `;
    formatted += `${minutes}m`;

    return {
      seconds: uptimeSeconds,
      formatted: formatted.trim(),
      bootTime,
    };
  }

  async getInstalledPhpVersions(): Promise<InstalledVersion[]> {
    const versions: InstalledVersion[] = [];

    try {
      if (this.distroDetector.isDebian()) {
        // Check common PHP versions on Debian/Ubuntu
        const phpVersions = ['7.4', '8.0', '8.1', '8.2', '8.3'];
        for (const version of phpVersions) {
          try {
            const result = await this.executor.execute('php' + version, ['-v']);
            if (result.exitCode === 0) {
              const match = result.stdout.match(/PHP (\d+\.\d+\.\d+)/);
              versions.push({
                version: match ? match[1] : version,
                default: false,
              });
            }
          } catch {
            // Version not installed
          }
        }

        // Check default PHP version
        try {
          const defaultResult = await this.executor.execute('php', ['-v']);
          if (defaultResult.exitCode === 0) {
            const match = defaultResult.stdout.match(/PHP (\d+\.\d+)/);
            if (match) {
              const defaultVersion = versions.find(v => v.version.startsWith(match[1]));
              if (defaultVersion) {
                defaultVersion.default = true;
              }
            }
          }
        } catch {
          // PHP not installed
        }
      } else {
        // RHEL-based
        try {
          const result = await this.executor.execute('php', ['-v']);
          if (result.exitCode === 0) {
            const match = result.stdout.match(/PHP (\d+\.\d+\.\d+)/);
            if (match) {
              versions.push({ version: match[1], default: true });
            }
          }
        } catch {
          // PHP not installed
        }
      }
    } catch (error) {
      this.logger.error(`Failed to get PHP versions: ${error}`);
    }

    return versions;
  }

  async getInstalledNodeVersions(): Promise<InstalledVersion[]> {
    const versions: InstalledVersion[] = [];

    try {
      const result = await this.executor.execute('node', ['--version']);
      if (result.exitCode === 0) {
        const version = result.stdout.trim().replace('v', '');
        versions.push({ version, default: true });
      }
    } catch {
      // Node.js not installed
    }

    // Check for nvm managed versions
    try {
      const nvmResult = await this.executor.execute('bash', ['-c', 'source ~/.nvm/nvm.sh && nvm ls']);
      if (nvmResult.exitCode === 0) {
        const matches = nvmResult.stdout.matchAll(/v(\d+\.\d+\.\d+)/g);
        for (const match of matches) {
          if (!versions.find(v => v.version === match[1])) {
            versions.push({ version: match[1], default: false });
          }
        }
      }
    } catch {
      // nvm not installed
    }

    return versions;
  }

  async getServiceStatus(serviceName: string): Promise<ServiceStatus> {
    try {
      const isActiveResult = await this.executor.execute('systemctl', ['is-active', serviceName]);
      const isActive = isActiveResult.stdout.trim() === 'active';

      const isEnabledResult = await this.executor.execute('systemctl', ['is-enabled', serviceName]);
      const isEnabled = isEnabledResult.stdout.trim() === 'enabled';

      let status: ServiceStatus['status'] = 'unknown';
      if (isActive) {
        status = 'running';
      } else if (isActiveResult.stdout.trim() === 'failed') {
        status = 'failed';
      } else {
        status = 'stopped';
      }

      return {
        name: serviceName,
        displayName: this.getServiceDisplayName(serviceName),
        status,
        enabled: isEnabled,
      };
    } catch {
      return {
        name: serviceName,
        displayName: this.getServiceDisplayName(serviceName),
        status: 'unknown',
        enabled: false,
      };
    }
  }

  private getServiceDisplayName(serviceName: string): string {
    const displayNames: Record<string, string> = {
      apache2: 'Apache HTTP Server',
      httpd: 'Apache HTTP Server',
      nginx: 'Nginx',
      mariadb: 'MariaDB',
      mysql: 'MySQL',
      'redis-server': 'Redis',
      redis: 'Redis',
      postfix: 'Postfix Mail Server',
      dovecot: 'Dovecot IMAP/POP3',
      bind9: 'BIND DNS Server',
      named: 'BIND DNS Server',
      csf: 'CSF Firewall',
      lfd: 'Login Failure Daemon',
      sshd: 'SSH Server',
    };

    return displayNames[serviceName] || serviceName;
  }

  async listServices(): Promise<ServiceStatus[]> {
    const serviceNames = [
      this.distroDetector.isDebian() ? 'apache2' : 'httpd',
      'nginx',
      'mariadb',
      this.distroDetector.isDebian() ? 'redis-server' : 'redis',
      'postfix',
      'dovecot',
      this.distroDetector.isDebian() ? 'bind9' : 'named',
      'csf',
      'lfd',
      'sshd',
    ];

    const services: ServiceStatus[] = [];

    for (const name of serviceNames) {
      const status = await this.getServiceStatus(name);
      if (status.status !== 'unknown') {
        services.push(status);
      }
    }

    return services;
  }

  async startService(serviceName: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.executor.executeSudo('systemctl', ['start', serviceName]);
      this.logger.log(`Service ${serviceName} started`);
      return { success: true, message: `${serviceName} started successfully` };
    } catch (error) {
      return { success: false, message: `Failed to start ${serviceName}: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async stopService(serviceName: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.executor.executeSudo('systemctl', ['stop', serviceName]);
      this.logger.log(`Service ${serviceName} stopped`);
      return { success: true, message: `${serviceName} stopped successfully` };
    } catch (error) {
      return { success: false, message: `Failed to stop ${serviceName}: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async restartService(serviceName: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.executor.executeSudo('systemctl', ['restart', serviceName]);
      this.logger.log(`Service ${serviceName} restarted`);
      return { success: true, message: `${serviceName} restarted successfully` };
    } catch (error) {
      return { success: false, message: `Failed to restart ${serviceName}: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async enableService(serviceName: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.executor.executeSudo('systemctl', ['enable', serviceName]);
      this.logger.log(`Service ${serviceName} enabled`);
      return { success: true, message: `${serviceName} enabled successfully` };
    } catch (error) {
      return { success: false, message: `Failed to enable ${serviceName}: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async disableService(serviceName: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.executor.executeSudo('systemctl', ['disable', serviceName]);
      this.logger.log(`Service ${serviceName} disabled`);
      return { success: true, message: `${serviceName} disabled successfully` };
    } catch (error) {
      return { success: false, message: `Failed to disable ${serviceName}: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async getPackageUpdates(): Promise<{ count: number; securityCount: number; updates: PackageUpdate[] }> {
    const updates: PackageUpdate[] = [];

    try {
      if (this.distroDetector.isDebian()) {
        // Run apt update first (may need sudo)
        try {
          await this.executor.executeSudo('apt', ['update']);
        } catch {
          // Continue anyway
        }

        // List upgradable packages
        const result = await this.executor.execute('apt', ['list', '--upgradable']);
        if (result.exitCode === 0) {
          const lines = result.stdout.split('\n').slice(1); // Skip header
          for (const line of lines) {
            const match = line.match(/^(\S+)\/\S+ (\S+) \S+ \[upgradable from: (\S+)\]/);
            if (match) {
              updates.push({
                name: match[1],
                availableVersion: match[2],
                currentVersion: match[3],
                type: line.includes('security') ? 'security' : 'regular',
              });
            }
          }
        }
      } else {
        // RHEL-based - use dnf
        const result = await this.executor.execute('dnf', ['check-update']);
        // dnf check-update returns exit code 100 when updates are available
        if (result.exitCode === 0 || result.exitCode === 100) {
          const lines = result.stdout.split('\n');
          for (const line of lines) {
            const match = line.match(/^(\S+)\s+(\S+)\s+(\S+)/);
            if (match && !line.startsWith('Last') && match[1] !== 'Obsoleting') {
              updates.push({
                name: match[1],
                availableVersion: match[2],
                currentVersion: 'unknown',
                type: 'regular',
              });
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to get package updates: ${error}`);
    }

    const securityCount = updates.filter(u => u.type === 'security').length;

    return {
      count: updates.length,
      securityCount,
      updates: updates.slice(0, 50), // Limit to first 50
    };
  }

  async getLoadAverage(): Promise<{ load1: number; load5: number; load15: number }> {
    const loadAvg = os.loadavg();
    return {
      load1: Math.round(loadAvg[0] * 100) / 100,
      load5: Math.round(loadAvg[1] * 100) / 100,
      load15: Math.round(loadAvg[2] * 100) / 100,
    };
  }

  async getMemoryInfo(): Promise<{
    total: number;
    used: number;
    free: number;
    usedPercent: number;
  }> {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;

    return {
      total,
      used,
      free,
      usedPercent: Math.round((used / total) * 100 * 100) / 100,
    };
  }

  async getDiskInfo(): Promise<{
    total: number;
    used: number;
    free: number;
    usedPercent: number;
  }[]> {
    const disks: { total: number; used: number; free: number; usedPercent: number }[] = [];

    try {
      const result = await this.executor.execute('df', ['-B1', '--output=size,used,avail,pcent', '/']);
      if (result.exitCode === 0) {
        const lines = result.stdout.trim().split('\n').slice(1);
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 4) {
            const total = parseInt(parts[0], 10);
            const used = parseInt(parts[1], 10);
            const free = parseInt(parts[2], 10);
            const usedPercent = parseInt(parts[3].replace('%', ''), 10);

            disks.push({ total, used, free, usedPercent });
          }
        }
      }
    } catch {
      // Return empty array on error
    }

    return disks;
  }
}
