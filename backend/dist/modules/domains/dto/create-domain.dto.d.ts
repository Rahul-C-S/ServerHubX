import { WebServer, RuntimeType } from '../entities/domain.entity.js';
export declare class CreateDomainDto {
    name: string;
    webServer?: WebServer;
    runtimeType?: RuntimeType;
    phpVersion?: string;
    nodeVersion?: string;
    wwwRedirect?: boolean;
    customErrorPages?: Record<string, string>;
    ownerId?: string;
}
