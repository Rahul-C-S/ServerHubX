"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VhostService = void 0;
const common_1 = require("@nestjs/common");
const command_executor_service_js_1 = require("../../../core/executor/command-executor.service.js");
const path_resolver_service_js_1 = require("../../../core/distro/path-resolver.service.js");
const distro_detector_service_js_1 = require("../../../core/distro/distro-detector.service.js");
const transaction_manager_service_js_1 = require("../../../core/rollback/transaction-manager.service.js");
const logger_service_js_1 = require("../../../common/logger/logger.service.js");
const domain_entity_js_1 = require("../entities/domain.entity.js");
let VhostService = class VhostService {
    commandExecutor;
    pathResolver;
    distroDetector;
    transactionManager;
    logger;
    constructor(commandExecutor, pathResolver, distroDetector, transactionManager, logger) {
        this.commandExecutor = commandExecutor;
        this.pathResolver = pathResolver;
        this.distroDetector = distroDetector;
        this.transactionManager = transactionManager;
        this.logger = logger;
    }
    async generateVhostConfig(config) {
        const { sslEnabled, sslCertPath, sslKeyPath } = config;
        let vhostContent = '';
        vhostContent += this.generateHttpVhost(config);
        if (sslEnabled && sslCertPath && sslKeyPath) {
            vhostContent += '\n\n' + this.generateHttpsVhost(config);
        }
        return vhostContent;
    }
    generateHttpVhost(config) {
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
        if (forceHttps) {
            vhost += `
    # Redirect to HTTPS
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
`;
        }
        else {
            vhost += this.generateDirectoryConfig(config);
            vhost += this.generateRuntimeConfig(config);
        }
        if (wwwRedirect && !forceHttps) {
            vhost += `
    # Redirect www to non-www
    RewriteEngine On
    RewriteCond %{HTTP_HOST} ^www\\.(.+)$ [NC]
    RewriteRule ^(.*)$ http://%1$1 [L,R=301]
`;
        }
        if (config.customErrorPages) {
            vhost += this.generateErrorPagesConfig(config.customErrorPages);
        }
        if (config.extraConfig) {
            vhost += `\n    # Custom configuration\n    ${config.extraConfig.replace(/\n/g, '\n    ')}\n`;
        }
        vhost += `</VirtualHost>`;
        return vhost;
    }
    generateHttpsVhost(config) {
        const { domain, documentRoot, username, sslCertPath, sslKeyPath, wwwRedirect, } = config;
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
        vhost += this.generateDirectoryConfig(config);
        vhost += this.generateRuntimeConfig(config);
        if (wwwRedirect) {
            vhost += `
    # Redirect www to non-www
    RewriteEngine On
    RewriteCond %{HTTP_HOST} ^www\\.(.+)$ [NC]
    RewriteRule ^(.*)$ https://%1$1 [L,R=301]
`;
        }
        if (config.customErrorPages) {
            vhost += this.generateErrorPagesConfig(config.customErrorPages);
        }
        if (config.extraConfig) {
            vhost += `\n    # Custom configuration\n    ${config.extraConfig.replace(/\n/g, '\n    ')}\n`;
        }
        vhost += `</VirtualHost>`;
        return vhost;
    }
    generateDirectoryConfig(config) {
        const { documentRoot } = config;
        return `
    <Directory ${documentRoot}>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
`;
    }
    generateRuntimeConfig(config) {
        const { runtimeType, phpVersion, nodePort, username } = config;
        switch (runtimeType) {
            case domain_entity_js_1.RuntimeType.PHP:
                return this.generatePhpFpmConfig(username, phpVersion || '8.2');
            case domain_entity_js_1.RuntimeType.NODEJS:
                return this.generateNodeProxyConfig(nodePort || 3000);
            case domain_entity_js_1.RuntimeType.STATIC:
                return `
    # Static site - no additional configuration needed
`;
            default:
                return '';
        }
    }
    generatePhpFpmConfig(username, phpVersion) {
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
    generateNodeProxyConfig(port) {
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
    generateErrorPagesConfig(errorPages) {
        let config = '\n    # Custom Error Pages\n';
        for (const [code, page] of Object.entries(errorPages)) {
            config += `    ErrorDocument ${code} ${page}\n`;
        }
        return config;
    }
    getPhpFpmSocketPath(username, phpVersion) {
        if (this.distroDetector.isDebian()) {
            return `/run/php/php${phpVersion}-fpm-${username}.sock`;
        }
        return `/var/run/php-fpm/${username}.sock`;
    }
    async writeVhostFile(domain, content, transactionId) {
        const vhostPath = this.pathResolver.getApacheVhostPath(domain);
        await this.transactionManager.snapshotFile(transactionId, vhostPath);
        const result = await this.commandExecutor.execute('tee', [vhostPath], {
            stdin: content,
        });
        if (!result.success) {
            throw new Error(`Failed to write vhost file: ${result.stderr}`);
        }
        this.logger.log(`Wrote vhost file: ${vhostPath}`, 'VhostService');
        return vhostPath;
    }
    async enableSite(domain) {
        if (this.distroDetector.isDebian()) {
            const result = await this.commandExecutor.execute('a2ensite', [`${domain}.conf`]);
            if (!result.success) {
                throw new Error(`Failed to enable site: ${result.stderr}`);
            }
        }
        else {
        }
        this.logger.log(`Enabled site: ${domain}`, 'VhostService');
    }
    async disableSite(domain) {
        if (this.distroDetector.isDebian()) {
            const result = await this.commandExecutor.execute('a2dissite', [`${domain}.conf`]);
            if (!result.success && !result.stderr.includes('does not exist')) {
                throw new Error(`Failed to disable site: ${result.stderr}`);
            }
        }
        else {
            const vhostPath = this.pathResolver.getApacheVhostPath(domain);
            await this.commandExecutor.execute('rm', ['-f', vhostPath]);
        }
        this.logger.log(`Disabled site: ${domain}`, 'VhostService');
    }
    async deleteVhostFile(domain) {
        const vhostPath = this.pathResolver.getApacheVhostPath(domain);
        const result = await this.commandExecutor.execute('rm', ['-f', vhostPath]);
        if (!result.success) {
            this.logger.warn(`Failed to delete vhost file: ${result.stderr}`, 'VhostService');
        }
        if (this.distroDetector.isDebian()) {
            const enabledPath = this.pathResolver.getApacheVhostEnabledPath(domain);
            await this.commandExecutor.execute('rm', ['-f', enabledPath]);
        }
    }
    async validateConfig() {
        const result = await this.commandExecutor.execute('apachectl', ['configtest']);
        if (result.success) {
            return { valid: true };
        }
        return { valid: false, error: result.stderr };
    }
    async reloadApache() {
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
    async restartApache() {
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
    async isApacheRunning() {
        const apachePaths = this.pathResolver.getApachePaths();
        const result = await this.commandExecutor.execute('systemctl', [
            'is-active',
            apachePaths.serviceName,
        ]);
        return result.success && result.stdout.trim() === 'active';
    }
};
exports.VhostService = VhostService;
exports.VhostService = VhostService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [command_executor_service_js_1.CommandExecutorService,
        path_resolver_service_js_1.PathResolverService,
        distro_detector_service_js_1.DistroDetectorService,
        transaction_manager_service_js_1.TransactionManagerService,
        logger_service_js_1.LoggerService])
], VhostService);
//# sourceMappingURL=vhost.service.js.map