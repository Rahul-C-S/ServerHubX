import { BaseEntity } from '../../../common/entities/base.entity.js';
export declare enum AuditOperationType {
    CREATE = "CREATE",
    UPDATE = "UPDATE",
    DELETE = "DELETE",
    LOGIN = "LOGIN",
    LOGOUT = "LOGOUT",
    LOGIN_FAILED = "LOGIN_FAILED",
    PASSWORD_RESET = "PASSWORD_RESET",
    PERMISSION_DENIED = "PERMISSION_DENIED",
    SYSTEM_COMMAND = "SYSTEM_COMMAND",
    CONFIG_CHANGE = "CONFIG_CHANGE",
    BACKUP = "BACKUP",
    RESTORE = "RESTORE",
    SSL_REQUEST = "SSL_REQUEST",
    SSL_RENEWAL = "SSL_RENEWAL",
    SERVICE_START = "SERVICE_START",
    SERVICE_STOP = "SERVICE_STOP",
    SERVICE_RESTART = "SERVICE_RESTART",
    FIREWALL_CHANGE = "FIREWALL_CHANGE"
}
export declare enum AuditResourceType {
    USER = "USER",
    DOMAIN = "DOMAIN",
    DATABASE = "DATABASE",
    APP = "APP",
    DNS_ZONE = "DNS_ZONE",
    DNS_RECORD = "DNS_RECORD",
    SSL_CERTIFICATE = "SSL_CERTIFICATE",
    MAILBOX = "MAILBOX",
    BACKUP = "BACKUP",
    CRON_JOB = "CRON_JOB",
    SERVICE = "SERVICE",
    FIREWALL = "FIREWALL",
    SYSTEM = "SYSTEM"
}
export declare enum AuditSeverity {
    INFO = "INFO",
    WARNING = "WARNING",
    ERROR = "ERROR",
    CRITICAL = "CRITICAL"
}
export declare class AuditLog extends BaseEntity {
    operationType: AuditOperationType;
    resourceType?: AuditResourceType;
    resourceId?: string;
    resourceName?: string;
    userId?: string;
    userEmail?: string;
    ipAddress?: string;
    userAgent?: string;
    description?: string;
    oldValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    success: boolean;
    errorMessage?: string;
    severity: AuditSeverity;
    duration?: number;
    transactionId?: string;
}
