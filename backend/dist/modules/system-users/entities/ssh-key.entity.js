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
exports.SSHKey = exports.SSHKeyType = void 0;
const typeorm_1 = require("typeorm");
const base_entity_js_1 = require("../../../common/entities/base.entity.js");
const system_user_entity_js_1 = require("./system-user.entity.js");
var SSHKeyType;
(function (SSHKeyType) {
    SSHKeyType["RSA"] = "RSA";
    SSHKeyType["ED25519"] = "ED25519";
    SSHKeyType["ECDSA"] = "ECDSA";
    SSHKeyType["DSA"] = "DSA";
})(SSHKeyType || (exports.SSHKeyType = SSHKeyType = {}));
let SSHKey = class SSHKey extends base_entity_js_1.BaseEntity {
    name;
    publicKey;
    fingerprint;
    keyType;
    keyBits;
    systemUserId;
    systemUser;
    lastUsedAt;
    expiresAt;
    isExpired() {
        if (!this.expiresAt)
            return false;
        return new Date() > this.expiresAt;
    }
};
exports.SSHKey = SSHKey;
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], SSHKey.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'public_key', type: 'text' }),
    __metadata("design:type", String)
], SSHKey.prototype, "publicKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], SSHKey.prototype, "fingerprint", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'key_type',
        type: 'enum',
        enum: SSHKeyType,
        default: SSHKeyType.RSA,
    }),
    __metadata("design:type", String)
], SSHKey.prototype, "keyType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'key_bits', type: 'int', nullable: true }),
    __metadata("design:type", Number)
], SSHKey.prototype, "keyBits", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'system_user_id' }),
    __metadata("design:type", String)
], SSHKey.prototype, "systemUserId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => system_user_entity_js_1.SystemUser, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'system_user_id' }),
    __metadata("design:type", system_user_entity_js_1.SystemUser)
], SSHKey.prototype, "systemUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_used_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], SSHKey.prototype, "lastUsedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expires_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], SSHKey.prototype, "expiresAt", void 0);
exports.SSHKey = SSHKey = __decorate([
    (0, typeorm_1.Entity)('ssh_keys'),
    (0, typeorm_1.Index)(['systemUserId']),
    (0, typeorm_1.Index)(['fingerprint'], { unique: true })
], SSHKey);
//# sourceMappingURL=ssh-key.entity.js.map