import { BaseEntity } from '../../../common/entities/base.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { SystemUser } from '../../system-users/entities/system-user.entity.js';
export declare enum DomainStatus {
    ACTIVE = "ACTIVE",
    SUSPENDED = "SUSPENDED",
    PENDING = "PENDING",
    ERROR = "ERROR"
}
export declare enum WebServer {
    APACHE = "APACHE",
    NGINX = "NGINX"
}
export declare enum RuntimeType {
    PHP = "PHP",
    NODEJS = "NODEJS",
    STATIC = "STATIC"
}
export declare class Domain extends BaseEntity {
    name: string;
    status: DomainStatus;
    documentRoot: string;
    webServer: WebServer;
    runtimeType: RuntimeType;
    phpVersion?: string;
    nodeVersion?: string;
    sslEnabled: boolean;
    forceHttps: boolean;
    sslCertificateId?: string;
    wwwRedirect: boolean;
    customErrorPages?: Record<string, string>;
    extraApacheConfig?: string;
    ownerId: string;
    owner: User;
    systemUserId: string;
    systemUser: SystemUser;
    diskUsageMb: number;
    bandwidthUsedMb: number;
    lastAccessedAt?: Date;
    getFullUrl(): string;
    isSecure(): boolean;
}
