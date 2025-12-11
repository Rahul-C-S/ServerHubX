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
exports.PathResolverService = void 0;
const common_1 = require("@nestjs/common");
const distro_detector_service_js_1 = require("./distro-detector.service.js");
let PathResolverService = class PathResolverService {
    distroDetector;
    constructor(distroDetector) {
        this.distroDetector = distroDetector;
    }
    getApachePaths() {
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
        return {
            configDir: '/etc/httpd',
            sitesAvailable: '/etc/httpd/conf.d',
            sitesEnabled: '/etc/httpd/conf.d',
            modulesAvailable: '/etc/httpd/conf.modules.d',
            modulesEnabled: '/etc/httpd/conf.modules.d',
            logDir: '/var/log/httpd',
            serviceName: 'httpd',
        };
    }
    getPhpFpmPaths(version) {
        if (this.distroDetector.isDebian()) {
            return {
                configDir: `/etc/php/${version}/fpm`,
                logDir: '/var/log/php-fpm',
                serviceName: `php${version}-fpm`,
            };
        }
        return {
            configDir: '/etc/php-fpm.d',
            logDir: '/var/log/php-fpm',
            serviceName: 'php-fpm',
        };
    }
    getPhpFpmPoolDir(version) {
        if (this.distroDetector.isDebian()) {
            return `/etc/php/${version}/fpm/pool.d`;
        }
        return '/etc/php-fpm.d';
    }
    getBind9Paths() {
        if (this.distroDetector.isDebian()) {
            return {
                configDir: '/etc/bind',
                logDir: '/var/log/bind',
                serviceName: 'bind9',
            };
        }
        return {
            configDir: '/etc/named',
            logDir: '/var/log/named',
            serviceName: 'named',
        };
    }
    getBindZoneDir() {
        if (this.distroDetector.isDebian()) {
            return '/etc/bind/zones';
        }
        return '/var/named';
    }
    getBindNamedConfPath() {
        if (this.distroDetector.isDebian()) {
            return '/etc/bind/named.conf.local';
        }
        return '/etc/named.conf';
    }
    getPostfixPaths() {
        return {
            configDir: '/etc/postfix',
            logDir: '/var/log/mail',
            serviceName: 'postfix',
        };
    }
    getDovecotPaths() {
        return {
            configDir: '/etc/dovecot',
            logDir: '/var/log/dovecot',
            serviceName: 'dovecot',
        };
    }
    getMailDir() {
        return '/var/mail/vhosts';
    }
    getCertbotPaths() {
        return {
            letsencryptDir: '/etc/letsencrypt',
            certDir: '/etc/letsencrypt/live',
        };
    }
    getCSFPaths() {
        return {
            configDir: '/etc/csf',
            allowFile: '/etc/csf/csf.allow',
            denyFile: '/etc/csf/csf.deny',
        };
    }
    getUserHomeDir(username) {
        return `/home/${username}`;
    }
    getUserPublicHtml(username) {
        return `/home/${username}/public_html`;
    }
    getUserLogDir(username) {
        return `/home/${username}/logs`;
    }
    getUserTmpDir(username) {
        return `/home/${username}/tmp`;
    }
    getUserSslDir(username) {
        return `/home/${username}/ssl`;
    }
    getApacheVhostPath(domain) {
        const paths = this.getApachePaths();
        return `${paths.sitesAvailable}/${domain}.conf`;
    }
    getApacheVhostEnabledPath(domain) {
        const paths = this.getApachePaths();
        return `${paths.sitesEnabled}/${domain}.conf`;
    }
    getPhpFpmPoolPath(username, version) {
        const poolDir = this.getPhpFpmPoolDir(version);
        return `${poolDir}/${username}.conf`;
    }
    getPm2EcosystemPath(username, appName) {
        return `/home/${username}/.pm2/ecosystem.${appName}.config.js`;
    }
    getBackupDir() {
        return '/var/backups/serverhubx';
    }
    getSshAuthorizedKeysPath(username) {
        return `/home/${username}/.ssh/authorized_keys`;
    }
};
exports.PathResolverService = PathResolverService;
exports.PathResolverService = PathResolverService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [distro_detector_service_js_1.DistroDetectorService])
], PathResolverService);
//# sourceMappingURL=path-resolver.service.js.map