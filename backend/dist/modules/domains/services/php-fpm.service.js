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
exports.PhpFpmService = void 0;
const common_1 = require("@nestjs/common");
const command_executor_service_js_1 = require("../../../core/executor/command-executor.service.js");
const path_resolver_service_js_1 = require("../../../core/distro/path-resolver.service.js");
const distro_detector_service_js_1 = require("../../../core/distro/distro-detector.service.js");
const transaction_manager_service_js_1 = require("../../../core/rollback/transaction-manager.service.js");
const logger_service_js_1 = require("../../../common/logger/logger.service.js");
let PhpFpmService = class PhpFpmService {
    commandExecutor;
    pathResolver;
    distroDetector;
    transactionManager;
    logger;
    DEFAULT_CONFIG = {
        maxChildren: 5,
        startServers: 2,
        minSpareServers: 1,
        maxSpareServers: 3,
        maxRequests: 500,
        memoryLimit: '256M',
        maxExecutionTime: 300,
        maxInputTime: 300,
        postMaxSize: '64M',
        uploadMaxFilesize: '64M',
        displayErrors: false,
        logErrors: true,
        errorReporting: 'E_ALL & ~E_DEPRECATED & ~E_STRICT',
    };
    DANGEROUS_FUNCTIONS = [
        'exec',
        'passthru',
        'shell_exec',
        'system',
        'proc_open',
        'popen',
        'curl_exec',
        'curl_multi_exec',
        'parse_ini_file',
        'show_source',
        'pcntl_exec',
        'pcntl_fork',
    ];
    constructor(commandExecutor, pathResolver, distroDetector, transactionManager, logger) {
        this.commandExecutor = commandExecutor;
        this.pathResolver = pathResolver;
        this.distroDetector = distroDetector;
        this.transactionManager = transactionManager;
        this.logger = logger;
    }
    generatePoolConfig(config) {
        const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
        const { username, phpVersion, maxChildren, startServers, minSpareServers, maxSpareServers, maxRequests, memoryLimit, maxExecutionTime, maxInputTime, postMaxSize, uploadMaxFilesize, displayErrors, logErrors, errorReporting, openBasedir, disableFunctions, } = finalConfig;
        const homeDir = this.pathResolver.getUserHomeDir(username);
        const logDir = this.pathResolver.getUserLogDir(username);
        const tmpDir = this.pathResolver.getUserTmpDir(username);
        const socketPath = this.getSocketPath(username, phpVersion);
        const basedirPaths = openBasedir || `${homeDir}:/tmp:/usr/share/php:/var/lib/php`;
        const disabledFuncs = disableFunctions?.join(',') || this.DANGEROUS_FUNCTIONS.join(',');
        return `[${username}]
; Pool identification
user = ${username}
group = ${username}

; Socket configuration
listen = ${socketPath}
listen.owner = www-data
listen.group = www-data
listen.mode = 0660

; Process management
pm = dynamic
pm.max_children = ${maxChildren}
pm.start_servers = ${startServers}
pm.min_spare_servers = ${minSpareServers}
pm.max_spare_servers = ${maxSpareServers}
pm.max_requests = ${maxRequests}

; Status and ping
pm.status_path = /fpm-status-${username}
ping.path = /fpm-ping-${username}
ping.response = pong

; Logging
php_admin_flag[log_errors] = ${logErrors ? 'on' : 'off'}
php_admin_value[error_log] = ${logDir}/php-error.log
access.log = ${logDir}/php-access.log
slowlog = ${logDir}/php-slow.log
request_slowlog_timeout = 5s

; Environment
env[HOSTNAME] = $HOSTNAME
env[PATH] = /usr/local/bin:/usr/bin:/bin
env[TMP] = ${tmpDir}
env[TMPDIR] = ${tmpDir}
env[TEMP] = ${tmpDir}

; PHP settings
php_admin_value[memory_limit] = ${memoryLimit}
php_admin_value[max_execution_time] = ${maxExecutionTime}
php_admin_value[max_input_time] = ${maxInputTime}
php_admin_value[post_max_size] = ${postMaxSize}
php_admin_value[upload_max_filesize] = ${uploadMaxFilesize}
php_admin_flag[display_errors] = ${displayErrors ? 'on' : 'off'}
php_admin_value[error_reporting] = ${errorReporting}

; Security settings
php_admin_value[open_basedir] = ${basedirPaths}
php_admin_value[disable_functions] = ${disabledFuncs}
php_admin_flag[allow_url_fopen] = on
php_admin_flag[allow_url_include] = off
php_admin_value[session.save_path] = ${tmpDir}
php_admin_value[upload_tmp_dir] = ${tmpDir}
php_admin_value[sys_temp_dir] = ${tmpDir}

; Additional security
php_admin_value[cgi.fix_pathinfo] = 0
php_admin_value[expose_php] = Off
`;
    }
    getSocketPath(username, phpVersion) {
        if (this.distroDetector.isDebian()) {
            return `/run/php/php${phpVersion}-fpm-${username}.sock`;
        }
        return `/var/run/php-fpm/${username}.sock`;
    }
    async writePoolConfig(config, transactionId) {
        const poolPath = this.pathResolver.getPhpFpmPoolPath(config.username, config.phpVersion);
        const content = this.generatePoolConfig(config);
        await this.transactionManager.snapshotFile(transactionId, poolPath);
        const result = await this.commandExecutor.execute('tee', [poolPath], {
            stdin: content,
        });
        if (!result.success) {
            throw new Error(`Failed to write PHP-FPM pool config: ${result.stderr}`);
        }
        this.logger.log(`Wrote PHP-FPM pool config: ${poolPath}`, 'PhpFpmService');
        return poolPath;
    }
    async deletePoolConfig(username, phpVersion) {
        const poolPath = this.pathResolver.getPhpFpmPoolPath(username, phpVersion);
        const result = await this.commandExecutor.execute('rm', ['-f', poolPath]);
        if (!result.success) {
            this.logger.warn(`Failed to delete PHP-FPM pool config: ${result.stderr}`, 'PhpFpmService');
        }
    }
    async reloadPhpFpm(phpVersion) {
        const phpPaths = this.pathResolver.getPhpFpmPaths(phpVersion);
        const result = await this.commandExecutor.execute('systemctl', [
            'reload',
            phpPaths.serviceName,
        ]);
        if (!result.success) {
            throw new Error(`Failed to reload PHP-FPM: ${result.stderr}`);
        }
        this.logger.log(`Reloaded PHP-FPM ${phpVersion}`, 'PhpFpmService');
    }
    async restartPhpFpm(phpVersion) {
        const phpPaths = this.pathResolver.getPhpFpmPaths(phpVersion);
        const result = await this.commandExecutor.execute('systemctl', [
            'restart',
            phpPaths.serviceName,
        ]);
        if (!result.success) {
            throw new Error(`Failed to restart PHP-FPM: ${result.stderr}`);
        }
        this.logger.log(`Restarted PHP-FPM ${phpVersion}`, 'PhpFpmService');
    }
    async isPhpFpmRunning(phpVersion) {
        const phpPaths = this.pathResolver.getPhpFpmPaths(phpVersion);
        const result = await this.commandExecutor.execute('systemctl', [
            'is-active',
            phpPaths.serviceName,
        ]);
        return result.success && result.stdout.trim() === 'active';
    }
    async getAvailablePhpVersions() {
        const versions = ['7.4', '8.0', '8.1', '8.2', '8.3'];
        const available = [];
        for (const version of versions) {
            const phpPaths = this.pathResolver.getPhpFpmPaths(version);
            const result = await this.commandExecutor.execute('systemctl', [
                'is-enabled',
                phpPaths.serviceName,
            ]);
            if (result.success || result.stdout.includes('enabled') || result.stdout.includes('disabled')) {
                available.push(version);
            }
        }
        return available;
    }
    async getPoolStatus(username, _phpVersion) {
        const result = await this.commandExecutor.execute('find', [
            '/run/php',
            '-name',
            `*${username}*`,
        ]);
        if (!result.success || !result.stdout.includes(username)) {
            return null;
        }
        return {
            active: true,
            connections: 0,
            idle: 0,
        };
    }
};
exports.PhpFpmService = PhpFpmService;
exports.PhpFpmService = PhpFpmService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [command_executor_service_js_1.CommandExecutorService,
        path_resolver_service_js_1.PathResolverService,
        distro_detector_service_js_1.DistroDetectorService,
        transaction_manager_service_js_1.TransactionManagerService,
        logger_service_js_1.LoggerService])
], PhpFpmService);
//# sourceMappingURL=php-fpm.service.js.map