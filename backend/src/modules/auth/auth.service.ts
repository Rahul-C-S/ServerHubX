import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service.js';
import { User } from '../users/entities/user.entity.js';
import { AuditLoggerService } from '../../core/audit/audit-logger.service.js';
import { AuditOperationType } from '../../core/audit/entities/audit-log.entity.js';
import { LoggerService } from '../../common/logger/logger.service.js';
import { REDIS_CLIENT } from '../../common/redis/redis.module.js';
import type { JwtPayload, AuthResponse, TokenResponse } from './dto/auth.dto.js';

@Injectable()
export class AuthService {
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;
  private readonly REFRESH_TOKEN_PREFIX = 'refresh_token:';
  private readonly PASSWORD_RESET_PREFIX = 'password_reset:';

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLogger: AuditLoggerService,
    private readonly logger: LoggerService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    this.accessTokenExpiry = this.configService.get<string>('jwt.accessExpiry', '15m');
    this.refreshTokenExpiry = this.configService.get<string>('jwt.refreshExpiry', '7d');
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmailWithPassword(email);

    if (!user) {
      return null;
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is deactivated');
    }

    if (user.isLocked()) {
      throw new ForbiddenException('Account is temporarily locked');
    }

    const isValid = await user.validatePassword(password);

    if (!isValid) {
      await this.usersService.recordLoginAttempt(user.id, false);
      return null;
    }

    await this.usersService.recordLoginAttempt(user.id, true);
    return user;
  }

  async login(
    user: User,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload as object, {
      expiresIn: this.accessTokenExpiry as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });

    const refreshToken = uuidv4();
    await this.storeRefreshToken(user.id, refreshToken);

    await this.auditLogger.logSecurityEvent(
      AuditOperationType.LOGIN,
      `User logged in: ${user.email}`,
      { userId: user.id, userEmail: user.email, ipAddress, userAgent },
    );

    this.logger.log(`User logged in: ${user.email}`, 'AuthService');

    return {
      accessToken,
      expiresIn: this.parseExpiry(this.accessTokenExpiry),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async logout(
    userId: string,
    refreshToken: string,
    ipAddress?: string,
  ): Promise<void> {
    await this.invalidateRefreshToken(userId, refreshToken);

    const user = await this.usersService.findById(userId);
    await this.auditLogger.logSecurityEvent(
      AuditOperationType.LOGOUT,
      `User logged out: ${user.email}`,
      { userId, userEmail: user.email, ipAddress },
    );

    this.logger.log(`User logged out: ${user.email}`, 'AuthService');
  }

  async refreshAccessToken(
    userId: string,
    refreshToken: string,
  ): Promise<TokenResponse> {
    const isValid = await this.validateRefreshToken(userId, refreshToken);

    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(userId);

    if (!user.isActive) {
      throw new ForbiddenException('Account is deactivated');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload as object, {
      expiresIn: this.accessTokenExpiry as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });

    return {
      accessToken,
      expiresIn: this.parseExpiry(this.accessTokenExpiry),
    };
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      this.logger.debug(`Password reset requested for non-existent email: ${email}`, 'AuthService');
      return;
    }

    const resetToken = uuidv4();
    const key = `${this.PASSWORD_RESET_PREFIX}${resetToken}`;

    await this.redis.setex(key, 3600, user.id);

    this.logger.log(`Password reset token generated for: ${user.email}`, 'AuthService');

    await this.auditLogger.logSecurityEvent(
      AuditOperationType.PASSWORD_RESET,
      `Password reset requested for: ${user.email}`,
      { userId: user.id, userEmail: user.email },
    );
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const key = `${this.PASSWORD_RESET_PREFIX}${token}`;
    const userId = await this.redis.get(key);

    if (!userId) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    await this.usersService.setPassword(userId, newPassword);

    await this.redis.del(key);

    await this.invalidateAllRefreshTokens(userId);

    const user = await this.usersService.findById(userId);
    await this.auditLogger.logSecurityEvent(
      AuditOperationType.PASSWORD_RESET,
      `Password reset completed for: ${user.email}`,
      { userId, userEmail: user.email },
    );

    this.logger.log(`Password reset completed for: ${user.email}`, 'AuthService');
  }

  private async storeRefreshToken(
    userId: string,
    token: string,
  ): Promise<void> {
    const key = `${this.REFRESH_TOKEN_PREFIX}${userId}:${token}`;
    const expirySeconds = this.parseExpiry(this.refreshTokenExpiry);
    await this.redis.setex(key, expirySeconds, '1');
  }

  private async validateRefreshToken(
    userId: string,
    token: string,
  ): Promise<boolean> {
    const key = `${this.REFRESH_TOKEN_PREFIX}${userId}:${token}`;
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  private async invalidateRefreshToken(
    userId: string,
    token: string,
  ): Promise<void> {
    const key = `${this.REFRESH_TOKEN_PREFIX}${userId}:${token}`;
    await this.redis.del(key);
  }

  private async invalidateAllRefreshTokens(userId: string): Promise<void> {
    const pattern = `${this.REFRESH_TOKEN_PREFIX}${userId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 900;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900;
    }
  }
}
