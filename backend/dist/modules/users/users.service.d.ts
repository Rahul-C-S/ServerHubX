import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto, ChangePasswordDto } from './dto/update-user.dto.js';
import { LoggerService } from '../../common/logger/logger.service.js';
export declare class UsersService {
    private readonly usersRepository;
    private readonly logger;
    constructor(usersRepository: Repository<User>, logger: LoggerService);
    create(createUserDto: CreateUserDto): Promise<User>;
    findAll(page?: number, limit?: number, filters?: {
        role?: UserRole;
        isActive?: boolean;
        parentResellerId?: string;
    }): Promise<{
        users: User[];
        total: number;
    }>;
    findById(id: string): Promise<User>;
    findByEmail(email: string): Promise<User | null>;
    findByEmailWithPassword(email: string): Promise<User | null>;
    update(id: string, updateUserDto: UpdateUserDto): Promise<User>;
    changePassword(id: string, changePasswordDto: ChangePasswordDto): Promise<void>;
    setPassword(id: string, newPassword: string): Promise<void>;
    delete(id: string): Promise<void>;
    recordLoginAttempt(userId: string, success: boolean, _ipAddress?: string): Promise<void>;
    unlockAccount(id: string): Promise<void>;
    getClientsForReseller(resellerId: string): Promise<User[]>;
    countByRole(): Promise<Record<UserRole, number>>;
}
