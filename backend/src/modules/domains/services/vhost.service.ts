import { Injectable } from '@nestjs/common';
import { CommandExecutorService } from '../../../core/executor/command-executor.service.js';
import { PathResolverService } from '../../../core/distro/path-resolver.service.js';
import { DistroDetectorService } from '../../../core/distro/distro-detector.service.js';
import { TransactionManagerService } from '../../../core/rollback/transaction-manager.service.js';
import { LoggerService } from '../../../common/logger/logger.service.js';
import { RuntimeType } from '../entities/domain.entity.js';

export interface VhostConfig {
  domain: string;
  documentRoot: string;
  username: string;
  runtimeType: RuntimeType;
  phpVersion?: string;
  nodePort?: number;
  sslEnabled?: boolean;
  sslCertPath?: string;
  sslKeyPath?: string;
  forceHttps?: boolean;
  wwwRedirect?: boolean;
  customErrorPages?: Record<string, string>;
  extraConfig?: string;
}

@Injectable()
export class VhostService {
  constructor(
    private readonly commandExecutor: CommandExecutorService,
    private readonly pathResolver: PathResolverService,
    private readonly distroDetector: DistroDetectorService,
    private readonly transactionManager: TransactionManagerService,
    private readonly logger: LoggerService,
  ) {}

  async generateVhostConfig(config: VhostConfig): Promise<string> {
    const { sslEnabled, sslCertPath, sslKeyPath } = config;

    let vhostContent = '';

    // HTTP Virtual Host (port 80)
    vhostContent += this.generateHttpVhost(config);

    // HTTPS Virtual Host (port 443) if SSL is enabled
    if (sslEnabled && sslCertPath && sslKeyPath) {
      vhostContent += '\n\n' + this.generateHttpsVhost(config);
    }

    return vhostContent;
  }

  private generateHttpVhost(config: VhostConfig): string {
    const { domain, documentRoot, username, forceHttps, wwwRedirect } = config;
    const logDir = this.pathResolver.getUserLogDir(username);

    let vhost = `<VirtualHost *:80>
    ServerName ${domain}
    ServerAlias www.${domain}
    DocumentRoot ${documentRoot}

    # Logging
    ErrorLog ${logDir}/${domain}-error.log
    CustomLog ${logDir}/${domain}-access.log combined
`;

    // Force HTTPS redirect
    if (forceHttps) {
      vhost += `
    # Redirect to HTTPS
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
`;
    } else {
      // Add directory and runtime config
      vhost += this.generateDirectoryConfig(config);
      vhost += this.generateRuntimeConfig(config);
    }

    // WWW redirect
    if (wwwRedirect && !forceHttps) {
      vhost += `
    # Redirect www to non-www
    RewriteEngine On
    RewriteCond %{HTTP_HOST} ^www\\.(.+)$ [NC]
    RewriteRule ^(.*)$ http://%1$1 [L,R=301]
`;
    }

    // Custom error pages
    if (config.customErrorPages) {
      vhost += this.generateErrorPagesConfig(config.customErrorPages);
    }

    // Extra configuration
    if (config.extraConfig) {
      vhost += `\n    # Custom configuration\n    ${config.extraConfig.replace(/\n/g, '\n    ')}\n`;
    }

    vhost += `</VirtualHost>`;

    return vhost;
  }

  private generateHttpsVhost(config: VhostConfig): string {
    const {
      domain,
      documentRoot,
      username,
      sslCertPath,
      sslKeyPath,
      wwwRedirect,
    } = config;
    const logDir = this.pathResolver.getUserLogDir(username);

    let vhost = `<VirtualHost *:443>
    ServerName ${domain}
    ServerAlias www.${domain}
    DocumentRoot ${documentRoot}

    # SSL Configuration
    SSLEngine on
    SSLCertificateFile ${sslCertPath}
    SSLCertificateKeyFile ${sslKeyPath}

    # Modern SSL settings
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLHonorCipherOrder off
    SSLSessionTickets off

    # HSTS
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"

    # Logging
    ErrorLog ${logDir}/${domain}-ssl-error.log
    CustomLog ${logDir}/${domain}-ssl-access.log combined
`;

    // Directory and runtime configuration
    vhost += this.generateDirectoryConfig(config);
    vhost += this.generateRuntimeConfig(config);

    // WWW redirect
    if (wwwRedirect) {
      vhost += `
    # Redirect www to non-www
    RewriteEngine On
    RewriteCond %{HTTP_HOST} ^www\\.(.+)$ [NC]
    RewriteRule ^(.*)$ https://%1$1 [L,R=301]
`;
    }

    // Custom error pages
    if (config.customErrorPages) {
      vhost += this.generateErrorPagesConfig(config.customErrorPages);
    }

    // Extra configuration
    if (config.extraConfig) {
      vhost += `\n    # Custom configuration\n    ${config.extraConfig.replace(/\n/g, '\n    ')}\n`;
    }

    vhost += `</VirtualHost>`;

    return vhost;
  }

  private generateDirectoryConfig(config: VhostConfig): string {
    const { documentRoot } = config;

    return `
    <Directory ${documentRoot}>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
`;
  }

  private generateRuntimeConfig(config: VhostConfig): string {
    const { runtimeType, phpVersion, nodePort, username } = config;

    switch (runtimeType) {
      case RuntimeType.PHP:
        return this.generatePhpFpmConfig(username, phpVersion || '8.2');

      case RuntimeType.NODEJS:
        return this.generateNodeProxyConfig(nodePort || 3000);

      case RuntimeType.STATIC:
        return `
    # Static site - no additional configuration needed
`;

      default:
        return '';
    }
  }

  private generatePhpFpmConfig(username: string, phpVersion: string): string {
    const socketPath = this.getPhpFpmSocketPath(username, phpVersion);

    return `
    # PHP-FPM Configuration
    <FilesMatch \\.php$>
        SetHandler "proxy:unix:${socketPath}|fcgi://localhost"
    </FilesMatch>

    # Security headers
    <IfModule mod_headers.c>
        Header set X-Content-Type-Options "nosniff"
        Header set X-Frame-Options "SAMEORIGIN"
        Header set X-XSS-Protection "1; mode=block"
    </IfModule>
`;
  }

  private generateNodeProxyConfig(port: number): string {
    return `
    # Node.js Reverse Proxy Configuration
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:${port}/
    ProxyPassReverse / http://127.0.0.1:${port}/

    # WebSocket support
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://127.0.0.1:${port}/$1" [P,L]

    # Proxy headers
    <IfModule mod_headers.c>
        RequestHeader set X-Forwarded-Proto "https" env=HTTPS
        RequestHeader set X-Real-IP %{REMOTE_ADDR}s
    </IfModule>
`;
  }

  private generateErrorPagesConfig(errorPages: Record<string, string>): string {
    let config = '\n    # Custom Error Pages\n';

    for (const [code, page] of Object.entries(errorPages)) {
      config += `    ErrorDocument ${code} ${page}\n`;
    }

    return config;
  }

  private getPhpFpmSocketPath(username: string, phpVersion: string): string {
    if (this.distroDetector.isDebian()) {
      return `/run/php/php${phpVersion}-fpm-${username}.sock`;
    }
    // RHEL-based
    return `/var/run/php-fpm/${username}.sock`;
  }

  async writeVhostFile(domain: string, content: string, transactionId: string): Promise<string> {
    const vhostPath = this.pathResolver.getApacheVhostPath(domain);

    // Snapshot existing file if it exists
    await this.transactionManager.snapshotFile(transactionId, vhostPath);

    // Write the new vhost file
    const result = await this.commandExecutor.execute('tee', [vhostPath], {
      stdin: content,
    });

    if (!result.success) {
      throw new Error(`Failed to write vhost file: ${result.stderr}`);
    }

    this.logger.log(`Wrote vhost file: ${vhostPath}`, 'VhostService');
    return vhostPath;
  }

  async enableSite(domain: string): Promise<void> {
    if (this.distroDetector.isDebian()) {
      // Debian/Ubuntu - use a2ensite
      const result = await this.commandExecutor.execute('a2ensite', [`${domain}.conf`]);
      if (!result.success) {
        throw new Error(`Failed to enable site: ${result.stderr}`);
      }
    } else {
      // RHEL-based - sites are enabled by being in conf.d
      // Just need to reload Apache
    }

    this.logger.log(`Enabled site: ${domain}`, 'VhostService');
  }

  async disableSite(domain: string): Promise<void> {
    if (this.distroDetector.isDebian()) {
      // Debian/Ubuntu - use a2dissite
      const result = await this.commandExecutor.execute('a2dissite', [`${domain}.conf`]);
      if (!result.success && !result.stderr.includes('does not exist')) {
        throw new Error(`Failed to disable site: ${result.stderr}`);
      }
    } else {
      // RHEL-based - rename or remove the conf file
      const vhostPath = this.pathResolver.getApacheVhostPath(domain);
      await this.commandExecutor.execute('rm', ['-f', vhostPath]);
    }

    this.logger.log(`Disabled site: ${domain}`, 'VhostService');
  }

  async deleteVhostFile(domain: string): Promise<void> {
    const vhostPath = this.pathResolver.getApacheVhostPath(domain);

    const result = await this.commandExecutor.execute('rm', ['-f', vhostPath]);
    if (!result.success) {
      this.logger.warn(`Failed to delete vhost file: ${result.stderr}`, 'VhostService');
    }

    // Also delete enabled symlink on Debian
    if (this.distroDetector.isDebian()) {
      const enabledPath = this.pathResolver.getApacheVhostEnabledPath(domain);
      await this.commandExecutor.execute('rm', ['-f', enabledPath]);
    }
  }

  async validateConfig(): Promise<{ valid: boolean; error?: string }> {
    const result = await this.commandExecutor.execute('apachectl', ['configtest']);

    if (result.success) {
      return { valid: true };
    }

    return { valid: false, error: result.stderr };
  }

  async reloadApache(): Promise<void> {
    const apachePaths = this.pathResolver.getApachePaths();
    const result = await this.commandExecutor.execute('systemctl', [
      'reload',
      apachePaths.serviceName,
    ]);

    if (!result.success) {
      throw new Error(`Failed to reload Apache: ${result.stderr}`);
    }

    this.logger.log('Reloaded Apache', 'VhostService');
  }

  async restartApache(): Promise<void> {
    const apachePaths = this.pathResolver.getApachePaths();
    const result = await this.commandExecutor.execute('systemctl', [
      'restart',
      apachePaths.serviceName,
    ]);

    if (!result.success) {
      throw new Error(`Failed to restart Apache: ${result.stderr}`);
    }

    this.logger.log('Restarted Apache', 'VhostService');
  }

  async isApacheRunning(): Promise<boolean> {
    const apachePaths = this.pathResolver.getApachePaths();
    const result = await this.commandExecutor.execute('systemctl', [
      'is-active',
      apachePaths.serviceName,
    ]);

    return result.success && result.stdout.trim() === 'active';
  }
}
