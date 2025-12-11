import { DomainsService } from './domains.service.js';
import { CreateDomainDto } from './dto/create-domain.dto.js';
import { UpdateDomainDto } from './dto/update-domain.dto.js';
import { CreateSubdomainDto } from './dto/create-subdomain.dto.js';
import { User } from '../users/entities/user.entity.js';
export declare class DomainsController {
    private readonly domainsService;
    constructor(domainsService: DomainsService);
    create(dto: CreateDomainDto, user: User): Promise<import("./entities/domain.entity.js").Domain>;
    findAll(ownerId?: string, user?: User): Promise<import("./entities/domain.entity.js").Domain[]>;
    findOne(id: string): Promise<import("./entities/domain.entity.js").Domain>;
    update(id: string, dto: UpdateDomainDto, user: User): Promise<import("./entities/domain.entity.js").Domain>;
    delete(id: string, user: User): Promise<void>;
    suspend(id: string, user: User): Promise<import("./entities/domain.entity.js").Domain>;
    unsuspend(id: string, user: User): Promise<import("./entities/domain.entity.js").Domain>;
    getStats(id: string): Promise<{
        diskUsageMb: number;
        bandwidthUsedMb: number;
        subdomainCount: number;
    }>;
    listSubdomains(id: string): Promise<import("./entities/subdomain.entity.js").Subdomain[]>;
    createSubdomain(id: string, dto: CreateSubdomainDto, user: User): Promise<import("./entities/subdomain.entity.js").Subdomain>;
    deleteSubdomain(subdomainId: string): Promise<void>;
}
