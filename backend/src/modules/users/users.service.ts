import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto, ChangePasswordDto } from './dto/update-user.dto.js';
import { LoggerService } from '../../common/logger/logger.service.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly logger: LoggerService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const user = this.usersRepository.create({
      ...createUserDto,
      role: createUserDto.role || UserRole.DOMAIN_OWNER,
    });

    const savedUser = await this.usersRepository.save(user);
    this.logger.log(`User created: ${savedUser.email}`, 'UsersService');

    return this.findById(savedUser.id);
  }

  async findAll(
    page = 1,
    limit = 20,
    filters?: { role?: UserRole; isActive?: boolean; parentResellerId?: string },
  ): Promise<{ users: User[]; total: number }> {
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

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User not found: ${id}`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
    });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateUserDto.email);
      if (existingUser) {
        throw new ConflictException('Email already exists');
      }
    }

    Object.assign(user, updateUserDto);
    await this.usersRepository.save(user);

    this.logger.log(`User updated: ${user.email}`, 'UsersService');
    return this.findById(id);
  }

  async changePassword(
    id: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();

    if (!user) {
      throw new NotFoundException(`User not found: ${id}`);
    }

    const isValid = await user.validatePassword(changePasswordDto.currentPassword);
    if (!isValid) {
      throw new ForbiddenException('Current password is incorrect');
    }

    user.password = changePasswordDto.newPassword;
    await this.usersRepository.save(user);

    this.logger.log(`Password changed for user: ${user.email}`, 'UsersService');
  }

  async setPassword(id: string, newPassword: string): Promise<void> {
    const user = await this.findById(id);
    user.password = newPassword;
    await this.usersRepository.save(user);
    this.logger.log(`Password reset for user: ${user.email}`, 'UsersService');
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);
    await this.usersRepository.softDelete(id);
    this.logger.log(`User deleted: ${user.email}`, 'UsersService');
  }

  async recordLoginAttempt(
    userId: string,
    success: boolean,
    _ipAddress?: string,
  ): Promise<void> {
    const user = await this.findById(userId);

    if (success) {
      user.failedLoginAttempts = 0;
      user.lockedUntil = null as unknown as Date | undefined;
      user.lastLoginAt = new Date();
    } else {
      user.failedLoginAttempts += 1;

      // Lock account after 5 failed attempts for 15 minutes
      if (user.failedLoginAttempts >= 5) {
        const lockDuration = 15 * 60 * 1000; // 15 minutes
        user.lockedUntil = new Date(Date.now() + lockDuration);
        this.logger.warn(
          `Account locked due to failed login attempts: ${user.email}`,
          'UsersService',
        );
      }
    }

    await this.usersRepository.save(user);
  }

  async unlockAccount(id: string): Promise<void> {
    const user = await this.findById(id);
    user.failedLoginAttempts = 0;
    user.lockedUntil = null as unknown as Date | undefined;
    await this.usersRepository.save(user);
    this.logger.log(`Account unlocked: ${user.email}`, 'UsersService');
  }

  async getClientsForReseller(resellerId: string): Promise<User[]> {
    return this.usersRepository.find({
      where: { parentResellerId: resellerId },
      order: { createdAt: 'DESC' },
    });
  }

  async countByRole(): Promise<Record<UserRole, number>> {
    const results = await this.usersRepository
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.role')
      .getRawMany<{ role: UserRole; count: string }>();

    const counts: Record<UserRole, number> = {
      [UserRole.ROOT_ADMIN]: 0,
      [UserRole.RESELLER]: 0,
      [UserRole.DOMAIN_OWNER]: 0,
      [UserRole.DEVELOPER]: 0,
    };

    for (const result of results) {
      counts[result.role] = parseInt(result.count, 10);
    }

    return counts;
  }
}
