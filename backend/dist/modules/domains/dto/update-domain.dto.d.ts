import { DomainStatus, RuntimeType } from '../entities/domain.entity.js';
export declare class UpdateDomainDto {
    status?: DomainStatus;
    runtimeType?: RuntimeType;
    phpVersion?: string;
    nodeVersion?: string;
    sslEnabled?: boolean;
    forceHttps?: boolean;
    wwwRedirect?: boolean;
    customErrorPages?: Record<string, string>;
    extraApacheConfig?: string;
}
