import { RuntimeType } from '../entities/domain.entity.js';
export declare class CreateSubdomainDto {
    name: string;
    domainId: string;
    runtimeType?: RuntimeType;
    phpVersion?: string;
    nodeVersion?: string;
    isWildcard?: boolean;
    appPort?: number;
}
