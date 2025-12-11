import { Injectable, Logger } from '@nestjs/common';
import { CommandExecutorService } from '../../core/executor/command-executor.service.js';
import { DistroDetectorService } from '../../core/distro/distro-detector.service.js';
import { PathResolverService } from '../../core/distro/path-resolver.service.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface CSFInstallResult {
  success: boolean;
  message: string;
  version?: string;
}

@Injectable()
export class CsfInstallerService {
  private readonly logger = new Logger(CsfInstallerService.name);

  constructor(
    private readonly executor: CommandExecutorService,
    private readonly distroDetector: DistroDetectorService,
    private readonly pathResolver: PathResolverService,
  ) {}

  async isInstalled(): Promise<boolean> {
    try {
      const csfPaths = this.pathResolver.getCSFPaths();
      await fs.access(csfPaths.configDir);
      const result = await this.executor.execute('csf', ['--version']);
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  async getVersion(): Promise<string | null> {
    try {
      const result = await this.executor.execute('csf', ['--version']);
      if (result.exitCode === 0) {
        const match = result.stdout.match(/csf v([\d.]+)/);
        return match ? match[1] : result.stdout.trim();
      }
      return null;
    } catch {
      return null;
    }
  }

  async removeExistingFirewalls(): Promise<{ removed: string[]; errors: string[] }> {
    const removed: string[] = [];
    const errors: string[] = [];

    // Stop and disable UFW (Debian/Ubuntu)
    if (this.distroDetector.isDebian()) {
      try {
        const ufwStatus = await this.executor.execute('systemctl', ['is-active', 'ufw']);
        if (ufwStatus.stdout.trim() === 'active') {
          await this.executor.executeSudo('systemctl', ['stop', 'ufw']);
          await this.executor.executeSudo('systemctl', ['disable', 'ufw']);
          removed.push('UFW stopped and disabled');
          this.logger.log('UFW stopped and disabled');
        }
      } catch {
        this.logger.debug('UFW not present or already disabled');
      }
    }

    // Stop and disable firewalld (RHEL)
    if (this.distroDetector.isRHEL()) {
      try {
        const firewalldStatus = await this.executor.execute('systemctl', ['is-active', 'firewalld']);
        if (firewalldStatus.stdout.trim() === 'active') {
          await this.executor.executeSudo('systemctl', ['stop', 'firewalld']);
          await this.executor.executeSudo('systemctl', ['disable', 'firewalld']);
          removed.push('firewalld stopped and disabled');
          this.logger.log('firewalld stopped and disabled');
        }
      } catch {
        this.logger.debug('firewalld not present or already disabled');
      }
    }

    return { removed, errors };
  }

  async installCSF(): Promise<CSFInstallResult> {
    if (await this.isInstalled()) {
      const version = await this.getVersion();
      return {
        success: true,
        message: 'CSF is already installed',
        version: version || undefined,
      };
    }

    this.logger.log('Starting CSF installation...');
    await this.removeExistingFirewalls();

    const perlInstalled = await this.installPerlDependencies();
    if (!perlInstalled.success) {
      return perlInstalled;
    }

    if (await this.isInstalled()) {
      const version = await this.getVersion();
      return {
        success: true,
        message: 'CSF installed successfully',
        version: version || undefined,
      };
    }

    return {
      success: false,
      message: 'CSF installation requires manual intervention. Please run: cd /usr/src && wget https://download.configserver.com/csf.tgz && tar -xzf csf.tgz && cd csf && sh install.sh',
    };
  }

  private async installPerlDependencies(): Promise<CSFInstallResult> {
    try {
      if (this.distroDetector.isDebian()) {
        this.logger.log('Perl dependencies should be installed via system package manager');
      } else if (this.distroDetector.isRHEL()) {
        this.logger.log('Perl dependencies should be installed via system package manager');
      }

      return {
        success: true,
        message: 'Perl dependencies check completed',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to check perl dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async configureCSF(options: {
    tcpIn?: string;
    tcpOut?: string;
    udpIn?: string;
    udpOut?: string;
    testing?: boolean;
  }): Promise<CSFInstallResult> {
    if (!(await this.isInstalled())) {
      return {
        success: false,
        message: 'CSF is not installed',
      };
    }

    try {
      const csfPaths = this.pathResolver.getCSFPaths();
      const configPath = path.join(csfPaths.configDir, 'csf.conf');

      let config = await fs.readFile(configPath, 'utf-8');

      if (options.testing !== undefined) {
        config = config.replace(
          /^TESTING\s*=\s*["']?\d["']?/m,
          `TESTING = "${options.testing ? '1' : '0'}"`,
        );
      }

      if (options.tcpIn) {
        config = config.replace(
          /^TCP_IN\s*=\s*["'][^"']*["']/m,
          `TCP_IN = "${options.tcpIn}"`,
        );
      }

      if (options.tcpOut) {
        config = config.replace(
          /^TCP_OUT\s*=\s*["'][^"']*["']/m,
          `TCP_OUT = "${options.tcpOut}"`,
        );
      }

      if (options.udpIn) {
        config = config.replace(
          /^UDP_IN\s*=\s*["'][^"']*["']/m,
          `UDP_IN = "${options.udpIn}"`,
        );
      }

      if (options.udpOut) {
        config = config.replace(
          /^UDP_OUT\s*=\s*["'][^"']*["']/m,
          `UDP_OUT = "${options.udpOut}"`,
        );
      }

      const tempPath = `/tmp/csf.conf.${Date.now()}`;
      await fs.writeFile(tempPath, config);
      await this.executor.executeSudo('cp', [tempPath, configPath]);
      await fs.unlink(tempPath);

      this.logger.log('CSF configuration updated');

      return {
        success: true,
        message: 'CSF configured successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to configure CSF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async enableCSF(): Promise<CSFInstallResult> {
    if (!(await this.isInstalled())) {
      return {
        success: false,
        message: 'CSF is not installed',
      };
    }

    try {
      await this.executor.executeSudo('csf', ['-s']);
      await this.executor.executeSudo('systemctl', ['enable', 'csf']);
      await this.executor.executeSudo('systemctl', ['enable', 'lfd']);
      await this.executor.executeSudo('systemctl', ['start', 'lfd']);

      this.logger.log('CSF and LFD enabled and started');

      return {
        success: true,
        message: 'CSF enabled and started successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to enable CSF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async disableCSF(): Promise<CSFInstallResult> {
    if (!(await this.isInstalled())) {
      return {
        success: false,
        message: 'CSF is not installed',
      };
    }

    try {
      await this.executor.executeSudo('csf', ['-f']);
      await this.executor.executeSudo('systemctl', ['stop', 'lfd']);
      await this.executor.executeSudo('systemctl', ['disable', 'csf']);
      await this.executor.executeSudo('systemctl', ['disable', 'lfd']);

      this.logger.log('CSF and LFD disabled');

      return {
        success: true,
        message: 'CSF disabled successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to disable CSF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async getDefaultPorts(): Promise<{
    tcpIn: string;
    tcpOut: string;
    udpIn: string;
    udpOut: string;
  }> {
    return {
      tcpIn: '8130,20,21,22,25,53,80,110,143,443,465,587,993,995,3306',
      tcpOut: '8130,20,21,22,25,53,80,110,113,443,587,993,995,3306',
      udpIn: '20,21,53',
      udpOut: '20,21,53,113,123',
    };
  }
}
