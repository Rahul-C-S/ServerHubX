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
exports.Domain = exports.RuntimeType = exports.WebServer = exports.DomainStatus = void 0;
const typeorm_1 = require("typeorm");
const base_entity_js_1 = require("../../../common/entities/base.entity.js");
const user_entity_js_1 = require("../../users/entities/user.entity.js");
const system_user_entity_js_1 = require("../../system-users/entities/system-user.entity.js");
var DomainStatus;
(function (DomainStatus) {
    DomainStatus["ACTIVE"] = "ACTIVE";
    DomainStatus["SUSPENDED"] = "SUSPENDED";
    DomainStatus["PENDING"] = "PENDING";
    DomainStatus["ERROR"] = "ERROR";
})(DomainStatus || (exports.DomainStatus = DomainStatus = {}));
var WebServer;
(function (WebServer) {
    WebServer["APACHE"] = "APACHE";
    WebServer["NGINX"] = "NGINX";
})(WebServer || (exports.WebServer = WebServer = {}));
var RuntimeType;
(function (RuntimeType) {
    RuntimeType["PHP"] = "PHP";
    RuntimeType["NODEJS"] = "NODEJS";
    RuntimeType["STATIC"] = "STATIC";
})(RuntimeType || (exports.RuntimeType = RuntimeType = {}));
let Domain = class Domain extends base_entity_js_1.BaseEntity {
    name;
    status;
    documentRoot;
    webServer;
    runtimeType;
    phpVersion;
    nodeVersion;
    sslEnabled;
    forceHttps;
    sslCertificateId;
    wwwRedirect;
    customErrorPages;
    extraApacheConfig;
    ownerId;
    owner;
    systemUserId;
    systemUser;
    diskUsageMb;
    bandwidthUsedMb;
    lastAccessedAt;
    getFullUrl() {
        const protocol = this.sslEnabled ? 'https' : 'http';
        return `${protocol}://${this.name}`;
    }
    isSecure() {
        return this.sslEnabled && this.forceHttps;
    }
};
exports.Domain = Domain;
__decorate([
    (0, typeorm_1.Column)({ length: 253, unique: true }),
    __metadata("design:type", String)
], Domain.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: DomainStatus,
        default: DomainStatus.PENDING,
    }),
    __metadata("design:type", String)
], Domain.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'document_root', length: 512 }),
    __metadata("design:type", String)
], Domain.prototype, "documentRoot", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'web_server',
        type: 'enum',
        enum: WebServer,
        default: WebServer.APACHE,
    }),
    __metadata("design:type", String)
], Domain.prototype, "webServer", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'runtime_type',
        type: 'enum',
        enum: RuntimeType,
        default: RuntimeType.PHP,
    }),
    __metadata("design:type", String)
], Domain.prototype, "runtimeType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'php_version', length: 10, nullable: true }),
    __metadata("design:type", String)
], Domain.prototype, "phpVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'node_version', length: 10, nullable: true }),
    __metadata("design:type", String)
], Domain.prototype, "nodeVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ssl_enabled', default: false }),
    __metadata("design:type", Boolean)
], Domain.prototype, "sslEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'force_https', default: false }),
    __metadata("design:type", Boolean)
], Domain.prototype, "forceHttps", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ssl_certificate_id', nullable: true }),
    __metadata("design:type", String)
], Domain.prototype, "sslCertificateId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'www_redirect', default: true }),
    __metadata("design:type", Boolean)
], Domain.prototype, "wwwRedirect", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'custom_error_pages', type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Domain.prototype, "customErrorPages", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'extra_apache_config', type: 'text', nullable: true }),
    __metadata("design:type", String)
], Domain.prototype, "extraApacheConfig", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'owner_id' }),
    __metadata("design:type", String)
], Domain.prototype, "ownerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_js_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'owner_id' }),
    __metadata("design:type", user_entity_js_1.User)
], Domain.prototype, "owner", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'system_user_id' }),
    __metadata("design:type", String)
], Domain.prototype, "systemUserId", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => system_user_entity_js_1.SystemUser, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'system_user_id' }),
    __metadata("design:type", system_user_entity_js_1.SystemUser)
], Domain.prototype, "systemUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'disk_usage_mb', type: 'bigint', default: 0 }),
    __metadata("design:type", Number)
], Domain.prototype, "diskUsageMb", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'bandwidth_used_mb', type: 'bigint', default: 0 }),
    __metadata("design:type", Number)
], Domain.prototype, "bandwidthUsedMb", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_accessed_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Domain.prototype, "lastAccessedAt", void 0);
exports.Domain = Domain = __decorate([
    (0, typeorm_1.Entity)('domains'),
    (0, typeorm_1.Index)(['name'], { unique: true }),
    (0, typeorm_1.Index)(['ownerId']),
    (0, typeorm_1.Index)(['systemUserId']),
    (0, typeorm_1.Index)(['status'])
], Domain);
//# sourceMappingURL=domain.entity.js.map