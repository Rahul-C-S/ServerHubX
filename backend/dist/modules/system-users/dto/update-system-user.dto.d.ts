import { SystemUserStatus } from '../entities/system-user.entity.js';
export declare class UpdateSystemUserDto {
    password?: string;
    shell?: string;
    status?: SystemUserStatus;
    diskQuotaMb?: number;
    inodeQuota?: number;
    sshEnabled?: boolean;
    sftpOnly?: boolean;
}
