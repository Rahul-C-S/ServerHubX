"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = exports.UserRole = void 0;
const typeorm_1 = require("typeorm");
const argon2 = __importStar(require("argon2"));
const base_entity_js_1 = require("../../../common/entities/base.entity.js");
var UserRole;
(function (UserRole) {
    UserRole["ROOT_ADMIN"] = "ROOT_ADMIN";
    UserRole["RESELLER"] = "RESELLER";
    UserRole["DOMAIN_OWNER"] = "DOMAIN_OWNER";
    UserRole["DEVELOPER"] = "DEVELOPER";
})(UserRole || (exports.UserRole = UserRole = {}));
let User = class User extends base_entity_js_1.BaseEntity {
    email;
    password;
    firstName;
    lastName;
    role;
    isActive;
    totpSecret;
    totpEnabled;
    backupCodes;
    lastLoginAt;
    failedLoginAttempts;
    lockedUntil;
    parentResellerId;
    passwordChangedAt;
    originalPassword;
    async hashPassword() {
        if (this.password && this.password !== this.originalPassword) {
            this.password = await argon2.hash(this.password, {
                type: argon2.argon2id,
                memoryCost: 65536,
                timeCost: 3,
                parallelism: 4,
            });
            this.passwordChangedAt = new Date();
        }
    }
    async validatePassword(password) {
        try {
            return await argon2.verify(this.password, password);
        }
        catch {
            return false;
        }
    }
    isLocked() {
        if (!this.lockedUntil) {
            return false;
        }
        return new Date() < this.lockedUntil;
    }
    getFullName() {
        return `${this.firstName} ${this.lastName}`;
    }
};
exports.User = User;
__decorate([
    (0, typeorm_1.Column)({ length: 255, unique: true }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255, select: false }),
    __metadata("design:type", String)
], User.prototype, "password", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'first_name', length: 100 }),
    __metadata("design:type", String)
], User.prototype, "firstName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_name', length: 100 }),
    __metadata("design:type", String)
], User.prototype, "lastName", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: UserRole,
        default: UserRole.DOMAIN_OWNER,
    }),
    __metadata("design:type", String)
], User.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', default: true }),
    __metadata("design:type", Boolean)
], User.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'totp_secret', length: 255, nullable: true, select: false }),
    __metadata("design:type", String)
], User.prototype, "totpSecret", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'totp_enabled', default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "totpEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'backup_codes', type: 'json', nullable: true, select: false }),
    __metadata("design:type", Array)
], User.prototype, "backupCodes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_login_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], User.prototype, "lastLoginAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'failed_login_attempts', default: 0 }),
    __metadata("design:type", Number)
], User.prototype, "failedLoginAttempts", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'locked_until', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], User.prototype, "lockedUntil", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'parent_reseller_id', nullable: true }),
    __metadata("design:type", String)
], User.prototype, "parentResellerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'password_changed_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], User.prototype, "passwordChangedAt", void 0);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    (0, typeorm_1.BeforeUpdate)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], User.prototype, "hashPassword", null);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)('users'),
    (0, typeorm_1.Index)(['email'], { unique: true }),
    (0, typeorm_1.Index)(['role']),
    (0, typeorm_1.Index)(['parentResellerId'])
], User);
//# sourceMappingURL=user.entity.js.map