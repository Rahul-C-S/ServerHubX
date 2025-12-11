export interface ValidationResult {
    isValid: boolean;
    error?: string;
    sanitized?: string;
}
export declare class InputValidatorService {
    private readonly RESERVED_USERNAMES;
    private readonly RESERVED_PORTS;
    validateUsername(username: string): ValidationResult;
    validateDomainName(domain: string): ValidationResult;
    validatePath(path: string, allowedBasePath: string): ValidationResult;
    validatePort(port: number, checkReserved?: boolean): ValidationResult;
    validateEmail(email: string): ValidationResult;
    validateDatabaseName(name: string): ValidationResult;
    validateIPv4(ip: string): ValidationResult;
    validateCronExpression(expression: string): ValidationResult;
    sanitizeForShell(input: string): string;
    private normalizePath;
}
