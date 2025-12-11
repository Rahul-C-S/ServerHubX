import { Injectable } from '@nestjs/common';
import { CommandExecutorService } from '../../../core/executor/command-executor.service.js';
import { PathResolverService } from '../../../core/distro/path-resolver.service.js';
import { DistroDetectorService } from '../../../core/distro/distro-detector.service.js';
import { TransactionManagerService } from '../../../core/rollback/transaction-manager.service.js';
import { LoggerService } from '../../../common/logger/logger.service.js';

export interface PhpFpmPoolConfig {
  username: string;
  phpVersion: string;
  maxChildren?: number;
  startServers?: number;
  minSpareServers?: number;
  maxSpareServers?: number;
  maxRequests?: number;
  memoryLimit?: string;
  maxExecutionTime?: number;
  maxInputTime?: number;
  postMaxSize?: string;
  uploadMaxFilesize?: string;
  displayErrors?: boolean;
  logErrors?: boolean;
  errorReporting?: string;
  openBasedir?: string;
  disableFunctions?: string[];
}

@Injectable()
export class PhpFpmService {
  private readonly DEFAULT_CONFIG: Partial<PhpFpmPoolConfig> = {
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

  private readonly DANGEROUS_FUNCTIONS = [
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

  constructor(
    private readonly commandExecutor: CommandExecutorService,
    private readonly pathResolver: PathResolverService,
    private readonly distroDetector: DistroDetectorService,
    private readonly transactionManager: TransactionManagerService,
    private readonly logger: LoggerService,
  ) {}

  generatePoolConfig(config: PhpFpmPoolConfig): string {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const {
      username,
      phpVersion,
      maxChildren,
      startServers,
      minSpareServers,
      maxSpareServers,
      maxRequests,
      memoryLimit,
      maxExecutionTime,
      maxInputTime,
      postMaxSize,
      uploadMaxFilesize,
      displayErrors,
      logErrors,
      errorReporting,
      openBasedir,
      disableFunctions,
    } = finalConfig;

    const homeDir = this.pathResolver.getUserHomeDir(username);
    const logDir = this.pathResolver.getUserLogDir(username);
    const tmpDir = this.pathResolver.getUserTmpDir(username);
    const socketPath = this.getSocketPath(username, phpVersion);

    // Build open_basedir
    const basedirPaths = openBasedir || `${homeDir}:/tmp:/usr/share/php:/var/lib/php`;

    // Build disable_functions
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

  private getSocketPath(username: string, phpVersion: string): string {
    if (this.distroDetector.isDebian()) {
      return `/run/php/php${phpVersion}-fpm-${username}.sock`;
    }
    return `/var/run/php-fpm/${username}.sock`;
  }

  async writePoolConfig(config: PhpFpmPoolConfig, transactionId: string): Promise<string> {
    const poolPath = this.pathResolver.getPhpFpmPoolPath(config.username, config.phpVersion);
    const content = this.generatePoolConfig(config);

    // Snapshot existing file
    await this.transactionManager.snapshotFile(transactionId, poolPath);

    // Write the pool configuration
    const result = await this.commandExecutor.execute('tee', [poolPath], {
      stdin: content,
    });

    if (!result.success) {
      throw new Error(`Failed to write PHP-FPM pool config: ${result.stderr}`);
    }

    this.logger.log(`Wrote PHP-FPM pool config: ${poolPath}`, 'PhpFpmService');
    return poolPath;
  }

  async deletePoolConfig(username: string, phpVersion: string): Promise<void> {
    const poolPath = this.pathResolver.getPhpFpmPoolPath(username, phpVersion);

    const result = await this.commandExecutor.execute('rm', ['-f', poolPath]);
    if (!result.success) {
      this.logger.warn(`Failed to delete PHP-FPM pool config: ${result.stderr}`, 'PhpFpmService');
    }
  }

  async reloadPhpFpm(phpVersion: string): Promise<void> {
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

  async restartPhpFpm(phpVersion: string): Promise<void> {
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

  async isPhpFpmRunning(phpVersion: string): Promise<boolean> {
    const phpPaths = this.pathResolver.getPhpFpmPaths(phpVersion);

    const result = await this.commandExecutor.execute('systemctl', [
      'is-active',
      phpPaths.serviceName,
    ]);

    return result.success && result.stdout.trim() === 'active';
  }

  async getAvailablePhpVersions(): Promise<string[]> {
    // Check which PHP versions are installed
    const versions = ['7.4', '8.0', '8.1', '8.2', '8.3'];
    const available: string[] = [];

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

  async getPoolStatus(username: string, _phpVersion: string): Promise<{
    active: boolean;
    connections: number;
    idle: number;
  } | null> {
    // Check if the pool socket exists
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
      connections: 0, // Would need to parse status from fpm-status endpoint
      idle: 0,
    };
  }
}
