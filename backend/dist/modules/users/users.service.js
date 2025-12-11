"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_js_1 = require("./entities/user.entity.js");
const logger_service_js_1 = require("../../common/logger/logger.service.js");
let UsersService = class UsersService {
    usersRepository;
    logger;
    constructor(usersRepository, logger) {
        this.usersRepository = usersRepository;
        this.logger = logger;
    }
    async create(createUserDto) {
        const existingUser = await this.usersRepository.findOne({
            where: { email: createUserDto.email },
        });
        if (existingUser) {
            throw new common_1.ConflictException('Email already exists');
        }
        const user = this.usersRepository.create({
            ...createUserDto,
            role: createUserDto.role || user_entity_js_1.UserRole.DOMAIN_OWNER,
        });
        const savedUser = await this.usersRepository.save(user);
        this.logger.log(`User created: ${savedUser.email}`, 'UsersService');
        return this.findById(savedUser.id);
    }
    async findAll(page = 1, limit = 20, filters) {
        const skip = (page - 1) * limit;
        const queryBuilder = this.usersRepository.createQueryBuilder('user');
        if (filters?.role) {
            queryBuilder.andWhere('user.role = :role', { role: filters.role });
        }
        if (filters?.isActive !== undefined) {
            queryBuilder.andWhere('user.isActive = :isActive', {
                isActive: filters.isActive,
            });
        }
        if (filters?.parentResellerId) {
            queryBuilder.andWhere('user.parentResellerId = :parentResellerId', {
                parentResellerId: filters.parentResellerId,
            });
        }
        queryBuilder
            .orderBy('user.createdAt', 'DESC')
            .skip(skip)
            .take(limit);
        const [users, total] = await queryBuilder.getManyAndCount();
        return { users, total };
    }
    async findById(id) {
        const user = await this.usersRepository.findOne({
            where: { id },
        });
        if (!user) {
            throw new common_1.NotFoundException(`User not found: ${id}`);
        }
        return user;
    }
    async findByEmail(email) {
        return this.usersRepository.findOne({
            where: { email },
        });
    }
    async findByEmailWithPassword(email) {
        return this.usersRepository
            .createQueryBuilder('user')
            .addSelect('user.password')
            .where('user.email = :email', { email })
            .getOne();
    }
    async update(id, updateUserDto) {
        const user = await this.findById(id);
        if (updateUserDto.email && updateUserDto.email !== user.email) {
            const existingUser = await this.findByEmail(updateUserDto.email);
            if (existingUser) {
                throw new common_1.ConflictException('Email already exists');
            }
        }
        Object.assign(user, updateUserDto);
        await this.usersRepository.save(user);
        this.logger.log(`User updated: ${user.email}`, 'UsersService');
        return this.findById(id);
    }
    async changePassword(id, changePasswordDto) {
        const user = await this.usersRepository
            .createQueryBuilder('user')
            .addSelect('user.password')
            .where('user.id = :id', { id })
            .getOne();
        if (!user) {
            throw new common_1.NotFoundException(`User not found: ${id}`);
        }
        const isValid = await user.validatePassword(changePasswordDto.currentPassword);
        if (!isValid) {
            throw new common_1.ForbiddenException('Current password is incorrect');
        }
        user.password = changePasswordDto.newPassword;
        await this.usersRepository.save(user);
        this.logger.log(`Password changed for user: ${user.email}`, 'UsersService');
    }
    async setPassword(id, newPassword) {
        const user = await this.findById(id);
        user.password = newPassword;
        await this.usersRepository.save(user);
        this.logger.log(`Password reset for user: ${user.email}`, 'UsersService');
    }
    async delete(id) {
        const user = await this.findById(id);
        await this.usersRepository.softDelete(id);
        this.logger.log(`User deleted: ${user.email}`, 'UsersService');
    }
    async recordLoginAttempt(userId, success, _ipAddress) {
        const user = await this.findById(userId);
        if (success) {
            user.failedLoginAttempts = 0;
            user.lockedUntil = null;
            user.lastLoginAt = new Date();
        }
        else {
            user.failedLoginAttempts += 1;
            if (user.failedLoginAttempts >= 5) {
                const lockDuration = 15 * 60 * 1000;
                user.lockedUntil = new Date(Date.now() + lockDuration);
                this.logger.warn(`Account locked due to failed login attempts: ${user.email}`, 'UsersService');
            }
        }
        await this.usersRepository.save(user);
    }
    async unlockAccount(id) {
        const user = await this.findById(id);
        user.failedLoginAttempts = 0;
        user.lockedUntil = null;
        await this.usersRepository.save(user);
        this.logger.log(`Account unlocked: ${user.email}`, 'UsersService');
    }
    async getClientsForReseller(resellerId) {
        return this.usersRepository.find({
            where: { parentResellerId: resellerId },
            order: { createdAt: 'DESC' },
        });
    }
    async countByRole() {
        const results = await this.usersRepository
            .createQueryBuilder('user')
            .select('user.role', 'role')
            .addSelect('COUNT(*)', 'count')
            .groupBy('user.role')
            .getRawMany();
        const counts = {
            [user_entity_js_1.UserRole.ROOT_ADMIN]: 0,
            [user_entity_js_1.UserRole.RESELLER]: 0,
            [user_entity_js_1.UserRole.DOMAIN_OWNER]: 0,
            [user_entity_js_1.UserRole.DEVELOPER]: 0,
        };
        for (const result of results) {
            counts[result.role] = parseInt(result.count, 10);
        }
        return counts;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_js_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        logger_service_js_1.LoggerService])
], UsersService);
//# sourceMappingURL=users.service.js.map