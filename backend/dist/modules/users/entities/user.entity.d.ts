import { BaseEntity } from '../../../common/entities/base.entity.js';
export declare enum UserRole {
    ROOT_ADMIN = "ROOT_ADMIN",
    RESELLER = "RESELLER",
    DOMAIN_OWNER = "DOMAIN_OWNER",
    DEVELOPER = "DEVELOPER"
}
export declare class User extends BaseEntity {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isActive: boolean;
    totpSecret?: string;
    totpEnabled: boolean;
    backupCodes?: string[];
    lastLoginAt?: Date;
    failedLoginAttempts: number;
    lockedUntil?: Date;
    parentResellerId?: string;
    passwordChangedAt?: Date;
    private originalPassword?;
    hashPassword(): Promise<void>;
    validatePassword(password: string): Promise<boolean>;
    isLocked(): boolean;
    getFullName(): string;
}
