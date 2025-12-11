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
exports.AuditLog = exports.AuditSeverity = exports.AuditResourceType = exports.AuditOperationType = void 0;
const typeorm_1 = require("typeorm");
const base_entity_js_1 = require("../../../common/entities/base.entity.js");
var AuditOperationType;
(function (AuditOperationType) {
    AuditOperationType["CREATE"] = "CREATE";
    AuditOperationType["UPDATE"] = "UPDATE";
    AuditOperationType["DELETE"] = "DELETE";
    AuditOperationType["LOGIN"] = "LOGIN";
    AuditOperationType["LOGOUT"] = "LOGOUT";
    AuditOperationType["LOGIN_FAILED"] = "LOGIN_FAILED";
    AuditOperationType["PASSWORD_RESET"] = "PASSWORD_RESET";
    AuditOperationType["PERMISSION_DENIED"] = "PERMISSION_DENIED";
    AuditOperationType["SYSTEM_COMMAND"] = "SYSTEM_COMMAND";
    AuditOperationType["CONFIG_CHANGE"] = "CONFIG_CHANGE";
    AuditOperationType["BACKUP"] = "BACKUP";
    AuditOperationType["RESTORE"] = "RESTORE";
    AuditOperationType["SSL_REQUEST"] = "SSL_REQUEST";
    AuditOperationType["SSL_RENEWAL"] = "SSL_RENEWAL";
    AuditOperationType["SERVICE_START"] = "SERVICE_START";
    AuditOperationType["SERVICE_STOP"] = "SERVICE_STOP";
    AuditOperationType["SERVICE_RESTART"] = "SERVICE_RESTART";
    AuditOperationType["FIREWALL_CHANGE"] = "FIREWALL_CHANGE";
})(AuditOperationType || (exports.AuditOperationType = AuditOperationType = {}));
var AuditResourceType;
(function (AuditResourceType) {
    AuditResourceType["USER"] = "USER";
    AuditResourceType["DOMAIN"] = "DOMAIN";
    AuditResourceType["DATABASE"] = "DATABASE";
    AuditResourceType["APP"] = "APP";
    AuditResourceType["DNS_ZONE"] = "DNS_ZONE";
    AuditResourceType["DNS_RECORD"] = "DNS_RECORD";
    AuditResourceType["SSL_CERTIFICATE"] = "SSL_CERTIFICATE";
    AuditResourceType["MAILBOX"] = "MAILBOX";
    AuditResourceType["BACKUP"] = "BACKUP";
    AuditResourceType["CRON_JOB"] = "CRON_JOB";
    AuditResourceType["SERVICE"] = "SERVICE";
    AuditResourceType["FIREWALL"] = "FIREWALL";
    AuditResourceType["SYSTEM"] = "SYSTEM";
})(AuditResourceType || (exports.AuditResourceType = AuditResourceType = {}));
var AuditSeverity;
(function (AuditSeverity) {
    AuditSeverity["INFO"] = "INFO";
    AuditSeverity["WARNING"] = "WARNING";
    AuditSeverity["ERROR"] = "ERROR";
    AuditSeverity["CRITICAL"] = "CRITICAL";
})(AuditSeverity || (exports.AuditSeverity = AuditSeverity = {}));
let AuditLog = class AuditLog extends base_entity_js_1.BaseEntity {
    operationType;
    resourceType;
    resourceId;
    resourceName;
    userId;
    userEmail;
    ipAddress;
    userAgent;
    description;
    oldValue;
    newValue;
    metadata;
    success;
    errorMessage;
    severity;
    duration;
    transactionId;
};
exports.AuditLog = AuditLog;
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: AuditOperationType,
    }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], AuditLog.prototype, "operationType", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: AuditResourceType,
        nullable: true,
    }),
    __metadata("design:type", String)
], AuditLog.prototype, "resourceType", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "resourceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "resourceName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], AuditLog.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "userEmail", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "ipAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "userAgent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "oldValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "newValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], AuditLog.prototype, "success", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: AuditSeverity,
        default: AuditSeverity.INFO,
    }),
    __metadata("design:type", String)
], AuditLog.prototype, "severity", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], AuditLog.prototype, "duration", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "transactionId", void 0);
exports.AuditLog = AuditLog = __decorate([
    (0, typeorm_1.Entity)('audit_logs'),
    (0, typeorm_1.Index)(['userId', 'createdAt']),
    (0, typeorm_1.Index)(['operationType', 'createdAt']),
    (0, typeorm_1.Index)(['resourceType', 'resourceId']),
    (0, typeorm_1.Index)(['severity', 'createdAt'])
], AuditLog);
//# sourceMappingURL=audit-log.entity.js.map