import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import * as os from 'os';
import * as fs from 'fs/promises';
import { CommandExecutorService } from '../../core/executor/command-executor.service';

export interface SystemMetrics {
  timestamp: number;
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
    mountPoint: string;
  }[];
  network: {
    interface: string;
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  }[];
  uptime: number;
}

export interface ServiceStatus {
  name: string;
  active: boolean;
  running: boolean;
  enabled: boolean;
  status: string;
  pid?: number;
  memory?: number;
  cpu?: number;
}

export interface AppMetrics {
  appId: string;
  name: string;
  status: string;
  cpu: number;
  memory: number;
  uptime: number;
  restarts: number;
}

const METRICS_KEY_PREFIX = 'metrics:';
const METRICS_RETENTION_HOURS = 24;

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private previousNetworkStats: Map<string, { bytesIn: number; bytesOut: number }> = new Map();

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly commandExecutor: CommandExecutorService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async collectMetrics(): Promise<void> {
    try {
      const metrics = await this.collectSystemMetrics();
      await this.storeMetrics('system', metrics);
    } catch (error) {
      this.logger.error(`Failed to collect metrics: ${error}`);
    }
  }

  async collectSystemMetrics(): Promise<SystemMetrics> {
    const [cpuUsage, diskUsage, networkStats] = await Promise.all([
      this.getCpuUsage(),
      this.getDiskUsage(),
      this.getNetworkStats(),
    ]);

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
      timestamp: Date.now(),
      cpu: {
        usage: cpuUsage,
        loadAverage: os.loadavg(),
        cores: os.cpus().length,
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usagePercent: (usedMem / totalMem) * 100,
      },
      disk: diskUsage,
      network: networkStats,
      uptime: os.uptime(),
    };
  }

  async collectServiceMetrics(): Promise<ServiceStatus[]> {
    const services = [
      'apache2',
      'httpd',
      'nginx',
      'mariadb',
      'mysql',
      'redis-server',
      'redis',
      'php-fpm',
      'php8.2-fpm',
      'php8.1-fpm',
      'postfix',
      'dovecot',
      'named',
      'bind9',
    ];

    const statuses: ServiceStatus[] = [];

    for (const service of services) {
      try {
        const status = await this.getServiceStatus(service);
        if (status) {
          statuses.push(status);
        }
      } catch {
        // Service doesn't exist
      }
    }

    return statuses;
  }

  async collectAppMetrics(): Promise<AppMetrics[]> {
    try {
      const result = await this.commandExecutor.execute('pm2', ['jlist']);
      const apps = JSON.parse(result.stdout);

      return apps.map((app: Record<string, unknown>) => ({
        appId: String(app.pm_id),
        name: app.name as string,
        status: (app.pm2_env as Record<string, unknown>)?.status as string,
        cpu: app.monit ? (app.monit as Record<string, number>).cpu : 0,
        memory: app.monit ? (app.monit as Record<string, number>).memory : 0,
        uptime: (app.pm2_env as Record<string, number>)?.pm_uptime || 0,
        restarts: (app.pm2_env as Record<string, number>)?.restart_time || 0,
      }));
    } catch {
      return [];
    }
  }

  async getCurrentMetrics(): Promise<SystemMetrics> {
    const cached = await this.redis.get(`${METRICS_KEY_PREFIX}system:current`);
    if (cached) {
      return JSON.parse(cached);
    }
    return this.collectSystemMetrics();
  }

  async getHistoricalMetrics(
    type: string,
    startTime: number,
    endTime: number,
  ): Promise<SystemMetrics[]> {
    const key = `${METRICS_KEY_PREFIX}${type}:history`;
    const entries = await this.redis.zrangebyscore(key, startTime, endTime);
    return entries.map((e) => JSON.parse(e));
  }

  async getServiceStatus(serviceName: string): Promise<ServiceStatus | null> {
    try {
      const result = await this.commandExecutor.execute('systemctl', [
        'show',
        serviceName,
        '--property=ActiveState,SubState,MainPID,MemoryCurrent,CPUUsageNSec,UnitFileState',
      ]);

      const props: Record<string, string> = {};
      for (const line of result.stdout.split('\n')) {
        const [key, value] = line.split('=');
        if (key && value) {
          props[key.trim()] = value.trim();
        }
      }

      if (!props.ActiveState || props.ActiveState === 'not-found') {
        return null;
      }

      return {
        name: serviceName,
        active: props.ActiveState === 'active',
        running: props.SubState === 'running',
        enabled: props.UnitFileState === 'enabled',
        status: props.SubState || props.ActiveState,
        pid: props.MainPID ? parseInt(props.MainPID, 10) : undefined,
        memory: props.MemoryCurrent ? parseInt(props.MemoryCurrent, 10) : undefined,
        cpu: props.CPUUsageNSec ? parseInt(props.CPUUsageNSec, 10) / 1e9 : undefined,
      };
    } catch {
      return null;
    }
  }

  private async getCpuUsage(): Promise<number> {
    try {
      const content = await fs.readFile('/proc/stat', 'utf8');
      const lines = content.split('\n');
      const cpuLine = lines.find((l) => l.startsWith('cpu '));

      if (!cpuLine) return 0;

      const values = cpuLine.split(/\s+/).slice(1).map(Number);
      const idle = values[3];
      const total = values.reduce((a, b) => a + b, 0);

      const key = `${METRICS_KEY_PREFIX}cpu:previous`;
      const previous = await this.redis.get(key);

      await this.redis.set(key, JSON.stringify({ idle, total }), 'EX', 60);

      if (previous) {
        const prev = JSON.parse(previous);
        const idleDiff = idle - prev.idle;
        const totalDiff = total - prev.total;

        if (totalDiff > 0) {
          return ((totalDiff - idleDiff) / totalDiff) * 100;
        }
      }

      return 0;
    } catch {
      return os.loadavg()[0] * 100 / os.cpus().length;
    }
  }

  private async getDiskUsage(): Promise<SystemMetrics['disk']> {
    try {
      const result = await this.commandExecutor.execute('df', ['-B1', '-x', 'tmpfs', '-x', 'devtmpfs']);
      const lines = result.stdout.split('\n').slice(1).filter(Boolean);

      return lines.map((line) => {
        const parts = line.split(/\s+/);
        const total = parseInt(parts[1], 10);
        const used = parseInt(parts[2], 10);
        const free = parseInt(parts[3], 10);

        return {
          mountPoint: parts[5],
          total,
          used,
          free,
          usagePercent: total > 0 ? (used / total) * 100 : 0,
        };
      });
    } catch {
      return [];
    }
  }

  private async getNetworkStats(): Promise<SystemMetrics['network']> {
    try {
      const content = await fs.readFile('/proc/net/dev', 'utf8');
      const lines = content.split('\n').slice(2).filter(Boolean);

      const stats: SystemMetrics['network'] = [];

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const iface = parts[0].replace(':', '');

        if (iface === 'lo') continue;

        const bytesIn = parseInt(parts[1], 10);
        const packetsIn = parseInt(parts[2], 10);
        const bytesOut = parseInt(parts[9], 10);
        const packetsOut = parseInt(parts[10], 10);

        const previous = this.previousNetworkStats.get(iface);
        this.previousNetworkStats.set(iface, { bytesIn, bytesOut });

        stats.push({
          interface: iface,
          bytesIn: previous ? bytesIn - previous.bytesIn : 0,
          bytesOut: previous ? bytesOut - previous.bytesOut : 0,
          packetsIn,
          packetsOut,
        });
      }

      return stats;
    } catch {
      return [];
    }
  }

  private async storeMetrics(type: string, metrics: SystemMetrics): Promise<void> {
    const currentKey = `${METRICS_KEY_PREFIX}${type}:current`;
    const historyKey = `${METRICS_KEY_PREFIX}${type}:history`;

    await this.redis.set(currentKey, JSON.stringify(metrics), 'EX', 60);

    await this.redis.zadd(historyKey, metrics.timestamp, JSON.stringify(metrics));

    const cutoff = Date.now() - METRICS_RETENTION_HOURS * 60 * 60 * 1000;
    await this.redis.zremrangebyscore(historyKey, 0, cutoff);
  }
}
