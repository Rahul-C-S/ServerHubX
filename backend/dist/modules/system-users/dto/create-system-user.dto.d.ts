export declare class CreateSystemUserDto {
    username: string;
    password?: string;
    shell?: string;
    diskQuotaMb?: number;
    inodeQuota?: number;
    sshEnabled?: boolean;
    sftpOnly?: boolean;
    ownerId?: string;
}
