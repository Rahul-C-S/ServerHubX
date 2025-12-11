import { BaseEntity } from '../../../common/entities/base.entity.js';
import { SystemUser } from './system-user.entity.js';
export declare enum SSHKeyType {
    RSA = "RSA",
    ED25519 = "ED25519",
    ECDSA = "ECDSA",
    DSA = "DSA"
}
export declare class SSHKey extends BaseEntity {
    name: string;
    publicKey: string;
    fingerprint: string;
    keyType: SSHKeyType;
    keyBits?: number;
    systemUserId: string;
    systemUser: SystemUser;
    lastUsedAt?: Date;
    expiresAt?: Date;
    isExpired(): boolean;
}
