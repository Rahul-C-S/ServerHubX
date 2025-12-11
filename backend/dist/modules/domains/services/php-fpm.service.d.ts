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
export declare class PhpFpmService {
    private readonly commandExecutor;
    private readonly pathResolver;
    private readonly distroDetector;
    private readonly transactionManager;
    private readonly logger;
    private readonly DEFAULT_CONFIG;
    private readonly DANGEROUS_FUNCTIONS;
    constructor(commandExecutor: CommandExecutorService, pathResolver: PathResolverService, distroDetector: DistroDetectorService, transactionManager: TransactionManagerService, logger: LoggerService);
    generatePoolConfig(config: PhpFpmPoolConfig): string;
    private getSocketPath;
    writePoolConfig(config: PhpFpmPoolConfig, transactionId: string): Promise<string>;
    deletePoolConfig(username: string, phpVersion: string): Promise<void>;
    reloadPhpFpm(phpVersion: string): Promise<void>;
    restartPhpFpm(phpVersion: string): Promise<void>;
    isPhpFpmRunning(phpVersion: string): Promise<boolean>;
    getAvailablePhpVersions(): Promise<string[]>;
    getPoolStatus(username: string, _phpVersion: string): Promise<{
        active: boolean;
        connections: number;
        idle: number;
    } | null>;
}
