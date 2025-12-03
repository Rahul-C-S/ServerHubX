import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import {
  AuditLog,
  AuditOperationType,
  AuditResourceType,
  AuditSeverity,
} from './entities/audit-log.entity.js';
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

@Injectable()
export class AuditLoggerService {
  private operationStartTimes = new Map<string, number>();

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly logger: LoggerService,
  ) {}

  async log(
    params: AuditLogParams,
    context: AuditContext = {},
  ): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create({
      ...params,
      ...context,
      success: params.success ?? true,
      severity: params.severity ?? AuditSeverity.INFO,
    });

    try {
      const saved = await this.auditLogRepository.save(auditLog);
      this.logToWinston(saved);
      return saved;
    } catch (error) {
      this.logger.error(
        `Failed to save audit log: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        'AuditLogger',
      );
      throw error;
    }
  }

  startOperation(operationId: string): void {
    this.operationStartTimes.set(operationId, Date.now());
  }

  async logOperationComplete(
    operationId: string,
    params: AuditLogParams,
    context: AuditContext = {},
  ): Promise<AuditLog> {
    const startTime = this.operationStartTimes.get(operationId);
    const duration = startTime ? Date.now() - startTime : undefined;
    this.operationStartTimes.delete(operationId);

    return this.log(
      {
        ...params,
        duration,
        success: true,
      },
      context,
    );
  }

  async logOperationFailed(
    operationId: string,
    params: AuditLogParams,
    error: Error,
    context: AuditContext = {},
  ): Promise<AuditLog> {
    const startTime = this.operationStartTimes.get(operationId);
    const duration = startTime ? Date.now() - startTime : undefined;
    this.operationStartTimes.delete(operationId);

    return this.log(
      {
        ...params,
        duration,
        success: false,
        errorMessage: error.message,
        severity: AuditSeverity.ERROR,
      },
      context,
    );
  }

  async logSecurityEvent(
    operationType: AuditOperationType,
    description: string,
    context: AuditContext,
    metadata?: Record<string, unknown>,
  ): Promise<AuditLog> {
    const severity =
      operationType === AuditOperationType.LOGIN_FAILED ||
      operationType === AuditOperationType.PERMISSION_DENIED
        ? AuditSeverity.WARNING
        : AuditSeverity.INFO;

    return this.log(
      {
        operationType,
        resourceType: AuditResourceType.SYSTEM,
        description,
        metadata,
        severity,
      },
      context,
    );
  }

  async getLogsForUser(
    userId: string,
    limit = 100,
    offset = 0,
  ): Promise<[AuditLog[], number]> {
    return this.auditLogRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async getLogsForResource(
    resourceType: AuditResourceType,
    resourceId: string,
    limit = 100,
    offset = 0,
  ): Promise<[AuditLog[], number]> {
    return this.auditLogRepository.findAndCount({
      where: { resourceType, resourceId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async getSecurityLogs(
    limit = 100,
    offset = 0,
  ): Promise<[AuditLog[], number]> {
    return this.auditLogRepository.findAndCount({
      where: [
        { operationType: AuditOperationType.LOGIN },
        { operationType: AuditOperationType.LOGOUT },
        { operationType: AuditOperationType.LOGIN_FAILED },
        { operationType: AuditOperationType.PERMISSION_DENIED },
        { operationType: AuditOperationType.PASSWORD_RESET },
      ],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async getFailedOperations(
    limit = 100,
    offset = 0,
  ): Promise<[AuditLog[], number]> {
    return this.auditLogRepository.findAndCount({
      where: { success: false },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async cleanupOldLogs(daysToKeep = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.auditLogRepository.delete({
      createdAt: LessThan(cutoffDate),
    });

    const deletedCount = result.affected || 0;
    if (deletedCount > 0) {
      this.logger.log(
        `Cleaned up ${deletedCount} audit logs older than ${daysToKeep} days`,
        'AuditLogger',
      );
    }

    return deletedCount;
  }

  private logToWinston(auditLog: AuditLog): void {
    const logLevel =
      auditLog.severity === AuditSeverity.ERROR ||
      auditLog.severity === AuditSeverity.CRITICAL
        ? 'error'
        : auditLog.severity === AuditSeverity.WARNING
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
}
