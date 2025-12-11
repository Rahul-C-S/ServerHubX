import { LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class LoggerService implements NestLoggerService {
    private configService;
    private logger;
    constructor(configService: ConfigService);
    log(message: string, context?: string): void;
    error(message: string, trace?: string, context?: string): void;
    warn(message: string, context?: string): void;
    debug(message: string, context?: string): void;
    verbose(message: string, context?: string): void;
    logWithMeta(level: string, message: string, meta: Record<string, unknown>): void;
}
