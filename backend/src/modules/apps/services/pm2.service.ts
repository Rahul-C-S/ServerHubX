import { Injectable } from '@nestjs/common';
import { CommandExecutorService } from '../../../core/executor/command-executor.service.js';
import { LoggerService } from '../../../common/logger/logger.service.js';
import { App } from '../entities/app.entity.js';

export interface Pm2ProcessInfo {
  name: string;
  pm_id: number;
  status: string;
  cpu: number;
  memory: number;
  uptime: number;
  restarts: number;
  unstable_restarts: number;
  created_at: number;
}

export interface Pm2LogOutput {
  out: string[];
  err: string[];
}

@Injectable()
export class Pm2Service {
  constructor(
    private readonly commandExecutor: CommandExecutorService,
    private readonly logger: LoggerService,
  ) {}

  generateEcosystemConfig(app: App, envVars: Record<string, string> = {}): string {
    const pm2Config = app.pm2Config || {};
    const processName = this.getProcessName(app);

    const config = {
      apps: [{
        name: processName,
        script: app.startCommand || `node ${app.entryPoint}`,
        cwd: app.path,
        instances: pm2Config.instances || 1,
        exec_mode: pm2Config.exec_mode || 'fork',
        max_memory_restart: pm2Config.max_memory_restart || '500M',
        watch: pm2Config.watch ?? false,
        ignore_watch: pm2Config.ignore_watch || ['node_modules', 'logs', '.git'],
        env: {
          NODE_ENV: 'production',
          PORT: app.port?.toString() || '3000',
          ...envVars,
          ...(pm2Config.env || {}),
        },
        node_args: pm2Config.node_args?.join(' ') || '',
        error_file: `${app.path}/logs/pm2-error.log`,
        out_file: `${app.path}/logs/pm2-out.log`,
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        merge_logs: true,
        autorestart: true,
        max_restarts: 10,
        restart_delay: 4000,
        cron_restart: pm2Config.cron_restart || undefined,
      }],
    };

    return `module.exports = ${JSON.stringify(config, null, 2)};`;
  }

  async writeEcosystemFile(app: App, envVars: Record<string, string> = {}): Promise<string> {
    const ecosystemContent = this.generateEcosystemConfig(app, envVars);
    const ecosystemPath = `${app.path}/${app.getEcosystemFileName()}`;

    const result = await this.commandExecutor.execute('tee', [ecosystemPath], {
      stdin: ecosystemContent,
    });

    if (!result.success) {
      throw new Error(`Failed to write ecosystem file: ${result.stderr}`);
    }

    return ecosystemPath;
  }

  async startApp(app: App, username: string): Promise<Pm2ProcessInfo> {
    const ecosystemPath = `${app.path}/${app.getEcosystemFileName()}`;
    const processName = this.getProcessName(app);

    // Start PM2 process as the domain user
    const result = await this.commandExecutor.execute(
      'pm2',
      ['start', ecosystemPath, '--name', processName],
      { runAs: username },
    );

    if (!result.success) {
      throw new Error(`Failed to start PM2 process: ${result.stderr}`);
    }

    // Save PM2 process list
    await this.savePm2List(username);

    this.logger.log(`Started PM2 process: ${processName}`, 'Pm2Service');
    return this.getAppStatus(processName, username);
  }

  async stopApp(processName: string, username: string): Promise<void> {
    const result = await this.commandExecutor.execute(
      'pm2',
      ['stop', processName],
      { runAs: username },
    );

    if (!result.success && !result.stderr.includes('not found')) {
      throw new Error(`Failed to stop PM2 process: ${result.stderr}`);
    }

    await this.savePm2List(username);
    this.logger.log(`Stopped PM2 process: ${processName}`, 'Pm2Service');
  }

  async restartApp(processName: string, username: string): Promise<Pm2ProcessInfo> {
    const result = await this.commandExecutor.execute(
      'pm2',
      ['restart', processName],
      { runAs: username },
    );

    if (!result.success) {
      throw new Error(`Failed to restart PM2 process: ${result.stderr}`);
    }

    await this.savePm2List(username);
    this.logger.log(`Restarted PM2 process: ${processName}`, 'Pm2Service');
    return this.getAppStatus(processName, username);
  }

  async reloadApp(processName: string, username: string): Promise<Pm2ProcessInfo> {
    // Zero-downtime reload
    const result = await this.commandExecutor.execute(
      'pm2',
      ['reload', processName],
      { runAs: username },
    );

    if (!result.success) {
      throw new Error(`Failed to reload PM2 process: ${result.stderr}`);
    }

    await this.savePm2List(username);
    this.logger.log(`Reloaded PM2 process: ${processName}`, 'Pm2Service');
    return this.getAppStatus(processName, username);
  }

  async deleteApp(processName: string, username: string): Promise<void> {
    const result = await this.commandExecutor.execute(
      'pm2',
      ['delete', processName],
      { runAs: username },
    );

    if (!result.success && !result.stderr.includes('not found')) {
      throw new Error(`Failed to delete PM2 process: ${result.stderr}`);
    }

    await this.savePm2List(username);
    this.logger.log(`Deleted PM2 process: ${processName}`, 'Pm2Service');
  }

  async getAppStatus(processName: string, username: string): Promise<Pm2ProcessInfo> {
    const result = await this.commandExecutor.execute(
      'pm2',
      ['jlist'],
      { runAs: username },
    );

    if (!result.success) {
      throw new Error(`Failed to get PM2 process list: ${result.stderr}`);
    }

    try {
      const processes: any[] = JSON.parse(result.stdout);
      const process = processes.find((p) => p.name === processName);

      if (!process) {
        return {
          name: processName,
          pm_id: -1,
          status: 'stopped',
          cpu: 0,
          memory: 0,
          uptime: 0,
          restarts: 0,
          unstable_restarts: 0,
          created_at: 0,
        };
      }

      return {
        name: process.name,
        pm_id: process.pm_id,
        status: process.pm2_env?.status || 'unknown',
        cpu: process.monit?.cpu || 0,
        memory: process.monit?.memory || 0,
        uptime: process.pm2_env?.pm_uptime || 0,
        restarts: process.pm2_env?.restart_time || 0,
        unstable_restarts: process.pm2_env?.unstable_restarts || 0,
        created_at: process.pm2_env?.created_at || 0,
      };
    } catch {
      throw new Error('Failed to parse PM2 process list');
    }
  }

  async getAppLogs(processName: string, username: string, lines: number = 100): Promise<Pm2LogOutput> {
    // Get stdout logs
    const outResult = await this.commandExecutor.execute(
      'pm2',
      ['logs', processName, '--nostream', '--lines', lines.toString(), '--out'],
      { runAs: username, timeout: 10000 },
    );

    // Get stderr logs
    const errResult = await this.commandExecutor.execute(
      'pm2',
      ['logs', processName, '--nostream', '--lines', lines.toString(), '--err'],
      { runAs: username, timeout: 10000 },
    );

    return {
      out: outResult.success ? outResult.stdout.split('\n').filter(Boolean) : [],
      err: errResult.success ? errResult.stderr.split('\n').filter(Boolean) : [],
    };
  }

  async flushLogs(processName: string, username: string): Promise<void> {
    const result = await this.commandExecutor.execute(
      'pm2',
      ['flush', processName],
      { runAs: username },
    );

    if (!result.success) {
      throw new Error(`Failed to flush PM2 logs: ${result.stderr}`);
    }

    this.logger.log(`Flushed PM2 logs: ${processName}`, 'Pm2Service');
  }

  async listAllApps(username: string): Promise<Pm2ProcessInfo[]> {
    const result = await this.commandExecutor.execute(
      'pm2',
      ['jlist'],
      { runAs: username },
    );

    if (!result.success) {
      return [];
    }

    try {
      const processes: any[] = JSON.parse(result.stdout);
      return processes.map((p) => ({
        name: p.name,
        pm_id: p.pm_id,
        status: p.pm2_env?.status || 'unknown',
        cpu: p.monit?.cpu || 0,
        memory: p.monit?.memory || 0,
        uptime: p.pm2_env?.pm_uptime || 0,
        restarts: p.pm2_env?.restart_time || 0,
        unstable_restarts: p.pm2_env?.unstable_restarts || 0,
        created_at: p.pm2_env?.created_at || 0,
      }));
    } catch {
      return [];
    }
  }

  private async savePm2List(username: string): Promise<void> {
    await this.commandExecutor.execute('pm2', ['save'], { runAs: username });
  }

  private getProcessName(app: App): string {
    return app.pm2ProcessName || `${app.name}-${app.domainId.substring(0, 8)}`;
  }

  async setupStartup(username: string): Promise<void> {
    // Generate startup script for the user
    const result = await this.commandExecutor.execute(
      'pm2',
      ['startup', 'systemd', '-u', username, '--hp', `/home/${username}`],
    );

    if (!result.success) {
      this.logger.warn(`Failed to setup PM2 startup: ${result.stderr}`, 'Pm2Service');
    }
  }
}
