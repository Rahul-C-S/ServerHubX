import { Injectable } from '@nestjs/common';
import { DistroDetectorService } from './distro-detector.service.js';

export interface ServicePaths {
  configDir: string;
  sitesAvailable?: string;
  sitesEnabled?: string;
  modulesAvailable?: string;
  modulesEnabled?: string;
  logDir: string;
  serviceName: string;
}

@Injectable()
export class PathResolverService {
  constructor(private readonly distroDetector: DistroDetectorService) {}

  getApachePaths(): ServicePaths {
    if (this.distroDetector.isDebian()) {
      return {
        configDir: '/etc/apache2',
        sitesAvailable: '/etc/apache2/sites-available',
        sitesEnabled: '/etc/apache2/sites-enabled',
        modulesAvailable: '/etc/apache2/mods-available',
        modulesEnabled: '/etc/apache2/mods-enabled',
        logDir: '/var/log/apache2',
        serviceName: 'apache2',
      };
    }

    // RHEL-based
    return {
      configDir: '/etc/httpd',
      sitesAvailable: '/etc/httpd/conf.d',
      sitesEnabled: '/etc/httpd/conf.d', // RHEL doesn't separate available/enabled
      modulesAvailable: '/etc/httpd/conf.modules.d',
      modulesEnabled: '/etc/httpd/conf.modules.d',
      logDir: '/var/log/httpd',
      serviceName: 'httpd',
    };
  }

  getPhpFpmPaths(version: string): ServicePaths {
    if (this.distroDetector.isDebian()) {
      return {
        configDir: `/etc/php/${version}/fpm`,
        logDir: '/var/log/php-fpm',
        serviceName: `php${version}-fpm`,
      };
    }

    // RHEL-based - uses php-fpm.d for pools
    return {
      configDir: '/etc/php-fpm.d',
      logDir: '/var/log/php-fpm',
      serviceName: 'php-fpm',
    };
  }

  getPhpFpmPoolDir(version: string): string {
    if (this.distroDetector.isDebian()) {
      return `/etc/php/${version}/fpm/pool.d`;
    }
    return '/etc/php-fpm.d';
  }

  getBind9Paths(): ServicePaths {
    if (this.distroDetector.isDebian()) {
      return {
        configDir: '/etc/bind',
        logDir: '/var/log/bind',
        serviceName: 'bind9',
      };
    }

    // RHEL-based
    return {
      configDir: '/etc/named',
      logDir: '/var/log/named',
      serviceName: 'named',
    };
  }

  getBindZoneDir(): string {
    if (this.distroDetector.isDebian()) {
      return '/etc/bind/zones';
    }
    return '/var/named';
  }

  getBindNamedConfPath(): string {
    if (this.distroDetector.isDebian()) {
      return '/etc/bind/named.conf.local';
    }
    return '/etc/named.conf';
  }

  getPostfixPaths(): ServicePaths {
    return {
      configDir: '/etc/postfix',
      logDir: '/var/log/mail',
      serviceName: 'postfix',
    };
  }

  getDovecotPaths(): ServicePaths {
    return {
      configDir: '/etc/dovecot',
      logDir: '/var/log/dovecot',
      serviceName: 'dovecot',
    };
  }

  getMailDir(): string {
    return '/var/mail/vhosts';
  }

  getCertbotPaths(): { letsencryptDir: string; certDir: string } {
    return {
      letsencryptDir: '/etc/letsencrypt',
      certDir: '/etc/letsencrypt/live',
    };
  }

  getCSFPaths(): { configDir: string; allowFile: string; denyFile: string } {
    return {
      configDir: '/etc/csf',
      allowFile: '/etc/csf/csf.allow',
      denyFile: '/etc/csf/csf.deny',
    };
  }

  getUserHomeDir(username: string): string {
    return `/home/${username}`;
  }

  getUserPublicHtml(username: string): string {
    return `/home/${username}/public_html`;
  }

  getUserLogDir(username: string): string {
    return `/home/${username}/logs`;
  }

  getUserTmpDir(username: string): string {
    return `/home/${username}/tmp`;
  }

  getUserSslDir(username: string): string {
    return `/home/${username}/ssl`;
  }

  getApacheVhostPath(domain: string): string {
    const paths = this.getApachePaths();
    return `${paths.sitesAvailable}/${domain}.conf`;
  }

  getApacheVhostEnabledPath(domain: string): string {
    const paths = this.getApachePaths();
    return `${paths.sitesEnabled}/${domain}.conf`;
  }

  getPhpFpmPoolPath(username: string, version: string): string {
    const poolDir = this.getPhpFpmPoolDir(version);
    return `${poolDir}/${username}.conf`;
  }

  getPm2EcosystemPath(username: string, appName: string): string {
    return `/home/${username}/.pm2/ecosystem.${appName}.config.js`;
  }

  getBackupDir(): string {
    return '/var/backups/serverhubx';
  }

  getSshAuthorizedKeysPath(username: string): string {
    return `/home/${username}/.ssh/authorized_keys`;
  }
}
