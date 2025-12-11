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
exports.AuditLoggerService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const audit_log_entity_js_1 = require("./entities/audit-log.entity.js");
const logger_service_js_1 = require("../../common/logger/logger.service.js");
let AuditLoggerService = class AuditLoggerService {
    auditLogRepository;
    logger;
    operationStartTimes = new Map();
    constructor(auditLogRepository, logger) {
        this.auditLogRepository = auditLogRepository;
        this.logger = logger;
    }
    async log(params, context = {}) {
        const auditLog = this.auditLogRepository.create({
            ...params,
            ...context,
            success: params.success ?? true,
            severity: params.severity ?? audit_log_entity_js_1.AuditSeverity.INFO,
        });
        try {
            const saved = await this.auditLogRepository.save(auditLog);
            this.logToWinston(saved);
            return saved;
        }
        catch (error) {
            this.logger.error(`Failed to save audit log: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined, 'AuditLogger');
            throw error;
        }
    }
    startOperation(operationId) {
        this.operationStartTimes.set(operationId, Date.now());
    }
    async logOperationComplete(operationId, params, context = {}) {
        const startTime = this.operationStartTimes.get(operationId);
        const duration = startTime ? Date.now() - startTime : undefined;
        this.operationStartTimes.delete(operationId);
        return this.log({
            ...params,
            duration,
            success: true,
        }, context);
    }
    async logOperationFailed(operationId, params, error, context = {}) {
        const startTime = this.operationStartTimes.get(operationId);
        const duration = startTime ? Date.now() - startTime : undefined;
        this.operationStartTimes.delete(operationId);
        return this.log({
            ...params,
            duration,
            success: false,
            errorMessage: error.message,
            severity: audit_log_entity_js_1.AuditSeverity.ERROR,
        }, context);
    }
    async logSecurityEvent(operationType, description, context, metadata) {
        const severity = operationType === audit_log_entity_js_1.AuditOperationType.LOGIN_FAILED ||
            operationType === audit_log_entity_js_1.AuditOperationType.PERMISSION_DENIED
            ? audit_log_entity_js_1.AuditSeverity.WARNING
            : audit_log_entity_js_1.AuditSeverity.INFO;
        return this.log({
            operationType,
            resourceType: audit_log_entity_js_1.AuditResourceType.SYSTEM,
            description,
            metadata,
            severity,
        }, context);
    }
    async getLogsForUser(userId, limit = 100, offset = 0) {
        return this.auditLogRepository.findAndCount({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset,
        });
    }
    async getLogsForResource(resourceType, resourceId, limit = 100, offset = 0) {
        return this.auditLogRepository.findAndCount({
            where: { resourceType, resourceId },
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset,
        });
    }
    async getSecurityLogs(limit = 100, offset = 0) {
        return this.auditLogRepository.findAndCount({
            where: [
                { operationType: audit_log_entity_js_1.AuditOperationType.LOGIN },
                { operationType: audit_log_entity_js_1.AuditOperationType.LOGOUT },
                { operationType: audit_log_entity_js_1.AuditOperationType.LOGIN_FAILED },
                { operationType: audit_log_entity_js_1.AuditOperationType.PERMISSION_DENIED },
                { operationType: audit_log_entity_js_1.AuditOperationType.PASSWORD_RESET },
            ],
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset,
        });
    }
    async getFailedOperations(limit = 100, offset = 0) {
        return this.auditLogRepository.findAndCount({
            where: { success: false },
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset,
        });
    }
    async cleanupOldLogs(daysToKeep = 90) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const result = await this.auditLogRepository.delete({
            createdAt: (0, typeorm_2.LessThan)(cutoffDate),
        });
        const deletedCount = result.affected || 0;
        if (deletedCount > 0) {
            this.logger.log(`Cleaned up ${deletedCount} audit logs older than ${daysToKeep} days`, 'AuditLogger');
        }
        return deletedCount;
    }
    logToWinston(auditLog) {
        const logLevel = auditLog.severity === audit_log_entity_js_1.AuditSeverity.ERROR ||
            auditLog.severity === audit_log_entity_js_1.AuditSeverity.CRITICAL
            ? 'error'
            : auditLog.severity === audit_log_entity_js_1.AuditSeverity.WARNING
                ? 'warn'
                : 'info';
        const message = `[AUDIT] ${auditLog.operationType}${auditLog.resourceType ? ` ${auditLog.resourceType}` : ''}${auditLog.resourceName ? ` "${auditLog.resourceName}"` : ''}: ${auditLog.description || 'No description'}`;
        this.logger.logWithMeta(logLevel, message, {
            context: 'Audit',
            auditId: auditLog.id,
            userId: auditLog.userId,
            ipAddress: auditLog.ipAddress,
            success: auditLog.success,
        });
    }
};
exports.AuditLoggerService = AuditLoggerService;
exports.AuditLoggerService = AuditLoggerService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(audit_log_entity_js_1.AuditLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        logger_service_js_1.LoggerService])
], AuditLoggerService);
//# sourceMappingURL=audit-logger.service.js.map