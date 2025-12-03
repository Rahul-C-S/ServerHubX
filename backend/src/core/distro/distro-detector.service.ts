import { Injectable, OnModuleInit } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { LoggerService } from '../../common/logger/logger.service.js';

export type DistroFamily = 'debian' | 'rhel' | 'unknown';
export type PackageManager = 'apt' | 'dnf' | 'unknown';

export interface DistroInfo {
  id: string;
  name: string;
  version: string;
  versionId: string;
  family: DistroFamily;
  packageManager: PackageManager;
  codename?: string;
}

@Injectable()
export class DistroDetectorService implements OnModuleInit {
  private distroInfo: DistroInfo | null = null;

  constructor(private readonly logger: LoggerService) {}

  async onModuleInit(): Promise<void> {
    await this.detectDistro();
  }

  async detectDistro(): Promise<DistroInfo> {
    if (this.distroInfo) {
      return this.distroInfo;
    }

    try {
      // Try /etc/os-release first (standard on modern Linux)
      this.distroInfo = await this.parseOsRelease();
    } catch {
      // Fallback detection methods
      this.distroInfo = await this.fallbackDetection();
    }

    this.logger.log(
      `Detected OS: ${this.distroInfo.name} ${this.distroInfo.version} (${this.distroInfo.family})`,
      'DistroDetector',
    );

    return this.distroInfo;
  }

  private async parseOsRelease(): Promise<DistroInfo> {
    const content = await readFile('/etc/os-release', 'utf-8');
    const lines = content.split('\n');
    const data: Record<string, string> = {};

    for (const line of lines) {
      const match = line.match(/^([A-Z_]+)=(.*)$/);
      if (match) {
        const key = match[1];
        let value = match[2];
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        data[key] = value;
      }
    }

    const id = (data['ID'] || 'unknown').toLowerCase();
    const family = this.determineFamily(id);

    return {
      id,
      name: data['NAME'] || data['PRETTY_NAME'] || 'Unknown',
      version: data['VERSION'] || data['VERSION_ID'] || 'Unknown',
      versionId: data['VERSION_ID'] || 'Unknown',
      family,
      packageManager: family === 'debian' ? 'apt' : family === 'rhel' ? 'dnf' : 'unknown',
      codename: data['VERSION_CODENAME'],
    };
  }

  private async fallbackDetection(): Promise<DistroInfo> {
    // Try debian_version
    try {
      const content = await readFile('/etc/debian_version', 'utf-8');
      return {
        id: 'debian',
        name: 'Debian',
        version: content.trim(),
        versionId: content.trim().split('.')[0],
        family: 'debian',
        packageManager: 'apt',
      };
    } catch {
      // Not Debian
    }

    // Try redhat-release
    try {
      const content = await readFile('/etc/redhat-release', 'utf-8');
      const match = content.match(/(\w+).*release\s+([\d.]+)/i);
      if (match) {
        const name = match[1].toLowerCase();
        return {
          id: name,
          name: match[1],
          version: match[2],
          versionId: match[2].split('.')[0],
          family: 'rhel',
          packageManager: 'dnf',
        };
      }
    } catch {
      // Not RHEL-based
    }

    // Unknown distribution
    this.logger.warn('Could not detect Linux distribution', 'DistroDetector');
    return {
      id: 'unknown',
      name: 'Unknown',
      version: 'Unknown',
      versionId: 'Unknown',
      family: 'unknown',
      packageManager: 'unknown',
    };
  }

  private determineFamily(id: string): DistroFamily {
    const debianFamily = ['debian', 'ubuntu', 'linuxmint', 'pop', 'elementary', 'kali'];
    const rhelFamily = ['rhel', 'centos', 'rocky', 'almalinux', 'fedora', 'ol', 'amzn'];

    if (debianFamily.includes(id)) {
      return 'debian';
    }
    if (rhelFamily.includes(id)) {
      return 'rhel';
    }
    return 'unknown';
  }

  getDistroInfo(): DistroInfo {
    if (!this.distroInfo) {
      throw new Error('Distribution not yet detected. Call detectDistro() first.');
    }
    return this.distroInfo;
  }

  isDebian(): boolean {
    return this.getDistroInfo().family === 'debian';
  }

  isRHEL(): boolean {
    return this.getDistroInfo().family === 'rhel';
  }

  getPackageManager(): PackageManager {
    return this.getDistroInfo().packageManager;
  }
}
