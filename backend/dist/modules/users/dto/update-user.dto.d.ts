import { UserRole } from '../entities/user.entity.js';
export declare class UpdateUserDto {
    email?: string;
    firstName?: string;
    lastName?: string;
    role?: UserRole;
    isActive?: boolean;
}
export declare class ChangePasswordDto {
    currentPassword: string;
    newPassword: string;
}
