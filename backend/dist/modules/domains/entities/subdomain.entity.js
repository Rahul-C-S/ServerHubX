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
exports.Subdomain = exports.SubdomainStatus = void 0;
const typeorm_1 = require("typeorm");
const base_entity_js_1 = require("../../../common/entities/base.entity.js");
const domain_entity_js_1 = require("./domain.entity.js");
var SubdomainStatus;
(function (SubdomainStatus) {
    SubdomainStatus["ACTIVE"] = "ACTIVE";
    SubdomainStatus["SUSPENDED"] = "SUSPENDED";
    SubdomainStatus["PENDING"] = "PENDING";
})(SubdomainStatus || (exports.SubdomainStatus = SubdomainStatus = {}));
let Subdomain = class Subdomain extends base_entity_js_1.BaseEntity {
    name;
    fullName;
    documentRoot;
    status;
    runtimeType;
    phpVersion;
    nodeVersion;
    sslEnabled;
    isWildcard;
    domainId;
    domain;
    appPort;
    getFullUrl() {
        const protocol = this.sslEnabled ? 'https' : 'http';
        return `${protocol}://${this.fullName}`;
    }
};
exports.Subdomain = Subdomain;
__decorate([
    (0, typeorm_1.Column)({ length: 63 }),
    __metadata("design:type", String)
], Subdomain.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'full_name', length: 253 }),
    __metadata("design:type", String)
], Subdomain.prototype, "fullName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'document_root', length: 512 }),
    __metadata("design:type", String)
], Subdomain.prototype, "documentRoot", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: SubdomainStatus,
        default: SubdomainStatus.PENDING,
    }),
    __metadata("design:type", String)
], Subdomain.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'runtime_type',
        type: 'enum',
        enum: domain_entity_js_1.RuntimeType,
        default: domain_entity_js_1.RuntimeType.PHP,
    }),
    __metadata("design:type", String)
], Subdomain.prototype, "runtimeType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'php_version', length: 10, nullable: true }),
    __metadata("design:type", String)
], Subdomain.prototype, "phpVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'node_version', length: 10, nullable: true }),
    __metadata("design:type", String)
], Subdomain.prototype, "nodeVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ssl_enabled', default: false }),
    __metadata("design:type", Boolean)
], Subdomain.prototype, "sslEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_wildcard', default: false }),
    __metadata("design:type", Boolean)
], Subdomain.prototype, "isWildcard", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'domain_id' }),
    __metadata("design:type", String)
], Subdomain.prototype, "domainId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => domain_entity_js_1.Domain, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'domain_id' }),
    __metadata("design:type", domain_entity_js_1.Domain)
], Subdomain.prototype, "domain", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'app_port', type: 'int', nullable: true }),
    __metadata("design:type", Number)
], Subdomain.prototype, "appPort", void 0);
exports.Subdomain = Subdomain = __decorate([
    (0, typeorm_1.Entity)('subdomains'),
    (0, typeorm_1.Index)(['name', 'domainId'], { unique: true }),
    (0, typeorm_1.Index)(['domainId'])
], Subdomain);
//# sourceMappingURL=subdomain.entity.js.map