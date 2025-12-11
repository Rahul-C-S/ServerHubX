import { SystemUsersService } from './system-users.service.js';
import { CreateSystemUserDto } from './dto/create-system-user.dto.js';
import { UpdateSystemUserDto } from './dto/update-system-user.dto.js';
import { AddSSHKeyDto } from './dto/add-ssh-key.dto.js';
import { User } from '../users/entities/user.entity.js';
export declare class SystemUsersController {
    private readonly systemUsersService;
    constructor(systemUsersService: SystemUsersService);
    create(dto: CreateSystemUserDto, user: User): Promise<import("./entities/system-user.entity.js").SystemUser>;
    findAll(ownerId?: string, user?: User): Promise<import("./entities/system-user.entity.js").SystemUser[]>;
    findOne(id: string): Promise<import("./system-users.service.js").SystemUserWithSSHKeys>;
    update(id: string, dto: UpdateSystemUserDto, user: User): Promise<import("./entities/system-user.entity.js").SystemUser>;
    delete(id: string, user: User): Promise<void>;
    setPassword(id: string, password: string, user: User): Promise<void>;
    getQuotaUsage(id: string): Promise<{
        diskUsedMb: number;
        inodeUsed: number;
    }>;
    listSSHKeys(id: string): Promise<import("./entities/ssh-key.entity.js").SSHKey[]>;
    addSSHKey(id: string, dto: AddSSHKeyDto, user: User): Promise<import("./entities/ssh-key.entity.js").SSHKey>;
    removeSSHKey(id: string, keyId: string, user: User): Promise<void>;
}
