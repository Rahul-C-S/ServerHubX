import { UserRole } from '../entities/user.entity.js';
export declare class CreateUserDto {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: UserRole;
    parentResellerId?: string;
}
