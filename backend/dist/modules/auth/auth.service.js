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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
const uuid_1 = require("uuid");
const users_service_js_1 = require("../users/users.service.js");
const audit_logger_service_js_1 = require("../../core/audit/audit-logger.service.js");
const audit_log_entity_js_1 = require("../../core/audit/entities/audit-log.entity.js");
const logger_service_js_1 = require("../../common/logger/logger.service.js");
const redis_module_js_1 = require("../../common/redis/redis.module.js");
let AuthService = class AuthService {
    usersService;
    jwtService;
    configService;
    auditLogger;
    logger;
    redis;
    accessTokenExpiry;
    refreshTokenExpiry;
    REFRESH_TOKEN_PREFIX = 'refresh_token:';
    PASSWORD_RESET_PREFIX = 'password_reset:';
    constructor(usersService, jwtService, configService, auditLogger, logger, redis) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.configService = configService;
        this.auditLogger = auditLogger;
        this.logger = logger;
        this.redis = redis;
        this.accessTokenExpiry = this.configService.get('jwt.accessExpiry', '15m');
        this.refreshTokenExpiry = this.configService.get('jwt.refreshExpiry', '7d');
    }
    async validateUser(email, password) {
        const user = await this.usersService.findByEmailWithPassword(email);
        if (!user) {
            return null;
        }
        if (!user.isActive) {
            throw new common_1.ForbiddenException('Account is deactivated');
        }
        if (user.isLocked()) {
            throw new common_1.ForbiddenException('Account is temporarily locked');
        }
        const isValid = await user.validatePassword(password);
        if (!isValid) {
            await this.usersService.recordLoginAttempt(user.id, false);
            return null;
        }
        await this.usersService.recordLoginAttempt(user.id, true);
        return user;
    }
    async login(user, ipAddress, userAgent) {
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };
        const accessToken = this.jwtService.sign(payload, {
            expiresIn: this.accessTokenExpiry,
        });
        const refreshToken = (0, uuid_1.v4)();
        await this.storeRefreshToken(user.id, refreshToken);
        await this.auditLogger.logSecurityEvent(audit_log_entity_js_1.AuditOperationType.LOGIN, `User logged in: ${user.email}`, { userId: user.id, userEmail: user.email, ipAddress, userAgent });
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
    async logout(userId, refreshToken, ipAddress) {
        await this.invalidateRefreshToken(userId, refreshToken);
        const user = await this.usersService.findById(userId);
        await this.auditLogger.logSecurityEvent(audit_log_entity_js_1.AuditOperationType.LOGOUT, `User logged out: ${user.email}`, { userId, userEmail: user.email, ipAddress });
        this.logger.log(`User logged out: ${user.email}`, 'AuthService');
    }
    async refreshAccessToken(userId, refreshToken) {
        const isValid = await this.validateRefreshToken(userId, refreshToken);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        const user = await this.usersService.findById(userId);
        if (!user.isActive) {
            throw new common_1.ForbiddenException('Account is deactivated');
        }
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };
        const accessToken = this.jwtService.sign(payload, {
            expiresIn: this.accessTokenExpiry,
        });
        return {
            accessToken,
            expiresIn: this.parseExpiry(this.accessTokenExpiry),
        };
    }
    async requestPasswordReset(email) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            this.logger.debug(`Password reset requested for non-existent email: ${email}`, 'AuthService');
            return;
        }
        const resetToken = (0, uuid_1.v4)();
        const key = `${this.PASSWORD_RESET_PREFIX}${resetToken}`;
        await this.redis.setex(key, 3600, user.id);
        this.logger.log(`Password reset token generated for: ${user.email}`, 'AuthService');
        await this.auditLogger.logSecurityEvent(audit_log_entity_js_1.AuditOperationType.PASSWORD_RESET, `Password reset requested for: ${user.email}`, { userId: user.id, userEmail: user.email });
    }
    async resetPassword(token, newPassword) {
        const key = `${this.PASSWORD_RESET_PREFIX}${token}`;
        const userId = await this.redis.get(key);
        if (!userId) {
            throw new common_1.UnauthorizedException('Invalid or expired reset token');
        }
        await this.usersService.setPassword(userId, newPassword);
        await this.redis.del(key);
        await this.invalidateAllRefreshTokens(userId);
        const user = await this.usersService.findById(userId);
        await this.auditLogger.logSecurityEvent(audit_log_entity_js_1.AuditOperationType.PASSWORD_RESET, `Password reset completed for: ${user.email}`, { userId, userEmail: user.email });
        this.logger.log(`Password reset completed for: ${user.email}`, 'AuthService');
    }
    async storeRefreshToken(userId, token) {
        const key = `${this.REFRESH_TOKEN_PREFIX}${userId}:${token}`;
        const expirySeconds = this.parseExpiry(this.refreshTokenExpiry);
        await this.redis.setex(key, expirySeconds, '1');
    }
    async validateRefreshToken(userId, token) {
        const key = `${this.REFRESH_TOKEN_PREFIX}${userId}:${token}`;
        const exists = await this.redis.exists(key);
        return exists === 1;
    }
    async invalidateRefreshToken(userId, token) {
        const key = `${this.REFRESH_TOKEN_PREFIX}${userId}:${token}`;
        await this.redis.del(key);
    }
    async invalidateAllRefreshTokens(userId) {
        const pattern = `${this.REFRESH_TOKEN_PREFIX}${userId}:*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
            await this.redis.del(...keys);
        }
    }
    parseExpiry(expiry) {
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(5, (0, common_1.Inject)(redis_module_js_1.REDIS_CLIENT)),
    __metadata("design:paramtypes", [users_service_js_1.UsersService,
        jwt_1.JwtService,
        config_1.ConfigService,
        audit_logger_service_js_1.AuditLoggerService,
        logger_service_js_1.LoggerService,
        ioredis_1.default])
], AuthService);
//# sourceMappingURL=auth.service.js.map