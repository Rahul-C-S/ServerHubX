import { CommandExecutorService } from '../../../core/executor/command-executor.service.js';
import { PathResolverService } from '../../../core/distro/path-resolver.service.js';
import { DistroDetectorService } from '../../../core/distro/distro-detector.service.js';
import { TransactionManagerService } from '../../../core/rollback/transaction-manager.service.js';
import { LoggerService } from '../../../common/logger/logger.service.js';
import { RuntimeType } from '../entities/domain.entity.js';
export interface VhostConfig {
    domain: string;
    documentRoot: string;
    username: string;
    runtimeType: RuntimeType;
    phpVersion?: string;
    nodePort?: number;
    sslEnabled?: boolean;
    sslCertPath?: string;
    sslKeyPath?: string;
    forceHttps?: boolean;
    wwwRedirect?: boolean;
    customErrorPages?: Record<string, string>;
    extraConfig?: string;
}
export declare class VhostService {
    private readonly commandExecutor;
    private readonly pathResolver;
    private readonly distroDetector;
    private readonly transactionManager;
    private readonly logger;
    constructor(commandExecutor: CommandExecutorService, pathResolver: PathResolverService, distroDetector: DistroDetectorService, transactionManager: TransactionManagerService, logger: LoggerService);
    generateVhostConfig(config: VhostConfig): Promise<string>;
    private generateHttpVhost;
    private generateHttpsVhost;
    private generateDirectoryConfig;
    private generateRuntimeConfig;
    private generatePhpFpmConfig;
    private generateNodeProxyConfig;
    private generateErrorPagesConfig;
    private getPhpFpmSocketPath;
    writeVhostFile(domain: string, content: string, transactionId: string): Promise<string>;
    enableSite(domain: string): Promise<void>;
    disableSite(domain: string): Promise<void>;
    deleteVhostFile(domain: string): Promise<void>;
    validateConfig(): Promise<{
        valid: boolean;
        error?: string;
    }>;
    reloadApache(): Promise<void>;
    restartApache(): Promise<void>;
    isApacheRunning(): Promise<boolean>;
}
