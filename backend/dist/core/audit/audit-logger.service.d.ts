import { Repository } from 'typeorm';
import { AuditLog, AuditOperationType, AuditResourceType, AuditSeverity } from './entities/audit-log.entity.js';
import { LoggerService } from '../../common/logger/logger.service.js';
export interface AuditContext {
    userId?: string;
    userEmail?: string;
    ipAddress?: string;
    userAgent?: string;
    transactionId?: string;
}
export interface AuditLogParams {
    operationType: AuditOperationType;
    resourceType?: AuditResourceType;
    resourceId?: string;
    resourceName?: string;
    description?: string;
    oldValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    success?: boolean;
    errorMessage?: string;
    severity?: AuditSeverity;
    duration?: number;
}
export declare class AuditLoggerService {
    private readonly auditLogRepository;
    private readonly logger;
    private operationStartTimes;
    constructor(auditLogRepository: Repository<AuditLog>, logger: LoggerService);
    log(params: AuditLogParams, context?: AuditContext): Promise<AuditLog>;
    startOperation(operationId: string): void;
    logOperationComplete(operationId: string, params: AuditLogParams, context?: AuditContext): Promise<AuditLog>;
    logOperationFailed(operationId: string, params: AuditLogParams, error: Error, context?: AuditContext): Promise<AuditLog>;
    logSecurityEvent(operationType: AuditOperationType, description: string, context: AuditContext, metadata?: Record<string, unknown>): Promise<AuditLog>;
    getLogsForUser(userId: string, limit?: number, offset?: number): Promise<[AuditLog[], number]>;
    getLogsForResource(resourceType: AuditResourceType, resourceId: string, limit?: number, offset?: number): Promise<[AuditLog[], number]>;
    getSecurityLogs(limit?: number, offset?: number): Promise<[AuditLog[], number]>;
    getFailedOperations(limit?: number, offset?: number): Promise<[AuditLog[], number]>;
    cleanupOldLogs(daysToKeep?: number): Promise<number>;
    private logToWinston;
}
