import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import * as path from 'path';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;

  constructor(private configService: ConfigService) {
    const logLevel = this.configService.get<string>('LOG_LEVEL', 'info');
    const logDir = this.configService.get<string>('LOG_DIR', '/var/log/serverhubx');
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    const formats = [
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
    ];

    if (nodeEnv === 'development') {
      formats.push(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
          const ctx = context ? `[${context}] ` : '';
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} ${level} ${ctx}${message}${metaStr}`;
        }),
      );
    } else {
      formats.push(winston.format.json());
    }

    const transports: winston.transport[] = [
      new winston.transports.Console(),
    ];

    if (nodeEnv === 'production') {
      transports.push(
        new winston.transports.File({
          filename: path.join(logDir, 'error.log'),
          level: 'error',
          maxsize: 100 * 1024 * 1024, // 100MB
          maxFiles: 5,
        }),
        new winston.transports.File({
          filename: path.join(logDir, 'combined.log'),
          maxsize: 100 * 1024 * 1024, // 100MB
          maxFiles: 10,
        }),
      );
    }

    this.logger = winston.createLogger({
      level: logLevel,
      format: winston.format.combine(...formats),
      transports,
      defaultMeta: { service: 'serverhubx' },
    });
  }

  log(message: string, context?: string): void {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string): void {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string): void {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string): void {
    this.logger.verbose(message, { context });
  }

  logWithMeta(level: string, message: string, meta: Record<string, unknown>): void {
    this.logger.log(level, message, meta);
  }
}
