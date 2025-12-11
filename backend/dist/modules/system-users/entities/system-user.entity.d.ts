import { BaseEntity } from '../../../common/entities/base.entity.js';
export declare enum SystemUserStatus {
    ACTIVE = "ACTIVE",
    SUSPENDED = "SUSPENDED",
    PENDING = "PENDING"
}
export declare class SystemUser extends BaseEntity {
    username: string;
    uid: number;
    gid: number;
    homeDirectory: string;
    shell: string;
    status: SystemUserStatus;
    diskQuotaMb: number;
    diskUsedMb: number;
    inodeQuota: number;
    inodeUsed: number;
    sshEnabled: boolean;
    sftpOnly: boolean;
    ownerId?: string;
    getDiskUsagePercent(): number;
    getInodeUsagePercent(): number;
    isQuotaExceeded(): boolean;
}
