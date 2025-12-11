import { LoggerService } from '../../common/logger/logger.service.js';
export interface CommandResult {
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number | null;
    command: string;
    args: string[];
    duration: number;
}
export interface ExecuteOptions {
    timeout?: number;
    cwd?: string;
    env?: Record<string, string>;
    stdin?: string;
    runAs?: string;
}
export declare class CommandExecutorService {
    private readonly logger;
    private readonly DEFAULT_TIMEOUT;
    private readonly MAX_TIMEOUT;
    constructor(logger: LoggerService);
    execute(command: string, args?: string[], options?: ExecuteOptions): Promise<CommandResult>;
    private spawnCommand;
    private sanitizeArgsForLog;
    executeWithRetry(command: string, args?: string[], options?: ExecuteOptions, maxRetries?: number, retryDelay?: number): Promise<CommandResult>;
    private delay;
}
