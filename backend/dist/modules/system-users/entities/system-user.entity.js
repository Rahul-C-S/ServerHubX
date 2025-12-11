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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemUser = exports.SystemUserStatus = void 0;
const typeorm_1 = require("typeorm");
const base_entity_js_1 = require("../../../common/entities/base.entity.js");
var SystemUserStatus;
(function (SystemUserStatus) {
    SystemUserStatus["ACTIVE"] = "ACTIVE";
    SystemUserStatus["SUSPENDED"] = "SUSPENDED";
    SystemUserStatus["PENDING"] = "PENDING";
})(SystemUserStatus || (exports.SystemUserStatus = SystemUserStatus = {}));
let SystemUser = class SystemUser extends base_entity_js_1.BaseEntity {
    username;
    uid;
    gid;
    homeDirectory;
    shell;
    status;
    diskQuotaMb;
    diskUsedMb;
    inodeQuota;
    inodeUsed;
    sshEnabled;
    sftpOnly;
    ownerId;
    getDiskUsagePercent() {
        if (this.diskQuotaMb === 0)
            return 0;
        return Math.round((this.diskUsedMb / this.diskQuotaMb) * 100);
    }
    getInodeUsagePercent() {
        if (this.inodeQuota === 0)
            return 0;
        return Math.round((this.inodeUsed / this.inodeQuota) * 100);
    }
    isQuotaExceeded() {
        if (this.diskQuotaMb > 0 && this.diskUsedMb >= this.diskQuotaMb) {
            return true;
        }
        if (this.inodeQuota > 0 && this.inodeUsed >= this.inodeQuota) {
            return true;
        }
        return false;
    }
};
exports.SystemUser = SystemUser;
__decorate([
    (0, typeorm_1.Column)({ length: 32, unique: true }),
    __metadata("design:type", String)
], SystemUser.prototype, "username", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', unique: true }),
    __metadata("design:type", Number)
], SystemUser.prototype, "uid", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], SystemUser.prototype, "gid", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'home_directory', length: 255 }),
    __metadata("design:type", String)
], SystemUser.prototype, "homeDirectory", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, default: '/bin/bash' }),
    __metadata("design:type", String)
], SystemUser.prototype, "shell", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: SystemUserStatus,
        default: SystemUserStatus.ACTIVE,
    }),
    __metadata("design:type", String)
], SystemUser.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'disk_quota_mb', type: 'bigint', default: 0 }),
    __metadata("design:type", Number)
], SystemUser.prototype, "diskQuotaMb", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'disk_used_mb', type: 'bigint', default: 0 }),
    __metadata("design:type", Number)
], SystemUser.prototype, "diskUsedMb", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'inode_quota', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], SystemUser.prototype, "inodeQuota", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'inode_used', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], SystemUser.prototype, "inodeUsed", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ssh_enabled', default: true }),
    __metadata("design:type", Boolean)
], SystemUser.prototype, "sshEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sftp_only', default: false }),
    __metadata("design:type", Boolean)
], SystemUser.prototype, "sftpOnly", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'owner_id', nullable: true }),
    __metadata("design:type", String)
], SystemUser.prototype, "ownerId", void 0);
exports.SystemUser = SystemUser = __decorate([
    (0, typeorm_1.Entity)('system_users'),
    (0, typeorm_1.Index)(['username'], { unique: true }),
    (0, typeorm_1.Index)(['uid'], { unique: true }),
    (0, typeorm_1.Index)(['status'])
], SystemUser);
//# sourceMappingURL=system-user.entity.js.map