import { BaseEntity } from '../../../common/entities/base.entity.js';
import { Domain, RuntimeType } from './domain.entity.js';
export declare enum SubdomainStatus {
    ACTIVE = "ACTIVE",
    SUSPENDED = "SUSPENDED",
    PENDING = "PENDING"
}
export declare class Subdomain extends BaseEntity {
    name: string;
    fullName: string;
    documentRoot: string;
    status: SubdomainStatus;
    runtimeType: RuntimeType;
    phpVersion?: string;
    nodeVersion?: string;
    sslEnabled: boolean;
    isWildcard: boolean;
    domainId: string;
    domain: Domain;
    appPort?: number;
    getFullUrl(): string;
}
