import { DistroDetectorService } from './distro-detector.service.js';
export interface ServicePaths {
    configDir: string;
    sitesAvailable?: string;
    sitesEnabled?: string;
    modulesAvailable?: string;
    modulesEnabled?: string;
    logDir: string;
    serviceName: string;
}
export declare class PathResolverService {
    private readonly distroDetector;
    constructor(distroDetector: DistroDetectorService);
    getApachePaths(): ServicePaths;
    getPhpFpmPaths(version: string): ServicePaths;
    getPhpFpmPoolDir(version: string): string;
    getBind9Paths(): ServicePaths;
    getBindZoneDir(): string;
    getBindNamedConfPath(): string;
    getPostfixPaths(): ServicePaths;
    getDovecotPaths(): ServicePaths;
    getMailDir(): string;
    getCertbotPaths(): {
        letsencryptDir: string;
        certDir: string;
    };
    getCSFPaths(): {
        configDir: string;
        allowFile: string;
        denyFile: string;
    };
    getUserHomeDir(username: string): string;
    getUserPublicHtml(username: string): string;
    getUserLogDir(username: string): string;
    getUserTmpDir(username: string): string;
    getUserSslDir(username: string): string;
    getApacheVhostPath(domain: string): string;
    getApacheVhostEnabledPath(domain: string): string;
    getPhpFpmPoolPath(username: string, version: string): string;
    getPm2EcosystemPath(username: string, appName: string): string;
    getBackupDir(): string;
    getSshAuthorizedKeysPath(username: string): string;
}
