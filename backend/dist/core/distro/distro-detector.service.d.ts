import { OnModuleInit } from '@nestjs/common';
import { LoggerService } from '../../common/logger/logger.service.js';
export type DistroFamily = 'debian' | 'rhel' | 'unknown';
export type PackageManager = 'apt' | 'dnf' | 'unknown';
export interface DistroInfo {
    id: string;
    name: string;
    version: string;
    versionId: string;
    family: DistroFamily;
    packageManager: PackageManager;
    codename?: string;
}
export declare class DistroDetectorService implements OnModuleInit {
    private readonly logger;
    private distroInfo;
    constructor(logger: LoggerService);
    onModuleInit(): Promise<void>;
    detectDistro(): Promise<DistroInfo>;
    private parseOsRelease;
    private fallbackDetection;
    private determineFamily;
    getDistroInfo(): DistroInfo;
    isDebian(): boolean;
    isRHEL(): boolean;
    getPackageManager(): PackageManager;
}
