export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  source: string;
  metadata?: Record<string, unknown>;
}

export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal',
} as const;
export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

export const LogSource = {
  APACHE: 'apache',
  NGINX: 'nginx',
  PHP_FPM: 'php-fpm',
  PM2: 'pm2',
  MARIADB: 'mariadb',
  POSTFIX: 'postfix',
  DOVECOT: 'dovecot',
  BIND9: 'bind9',
  SYSTEM: 'system',
  AUTH: 'auth',
  CSF: 'csf',
  APPLICATION: 'application',
} as const;
export type LogSource = (typeof LogSource)[keyof typeof LogSource];

export interface LogFilter {
  source?: LogSource;
  level?: LogLevel;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface LogStats {
  totalEntries: number;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  debugCount: number;
  bySource: Record<string, number>;
}

export interface LogFile {
  name: string;
  path: string;
  size: number;
  modifiedAt: Date;
  source: LogSource;
}
