import { Injectable } from '@nestjs/common';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitized?: string;
}

@Injectable()
export class InputValidatorService {
  // Reserved Linux usernames that cannot be used
  private readonly RESERVED_USERNAMES = new Set([
    'root',
    'admin',
    'administrator',
    'daemon',
    'bin',
    'sys',
    'sync',
    'games',
    'man',
    'lp',
    'mail',
    'news',
    'uucp',
    'proxy',
    'www-data',
    'backup',
    'list',
    'irc',
    'gnats',
    'nobody',
    'systemd-network',
    'systemd-resolve',
    'syslog',
    'messagebus',
    '_apt',
    'mysql',
    'redis',
    'postfix',
    'dovecot',
    'nginx',
    'apache',
    'httpd',
    'named',
    'bind',
    'postgres',
    'ftp',
    'ssh',
    'sshd',
    'ntp',
    'serverhubx',
  ]);

  // Reserved ports that cannot be used for applications
  private readonly RESERVED_PORTS = new Set([
    22, // SSH
    25, // SMTP
    53, // DNS
    80, // HTTP
    110, // POP3
    143, // IMAP
    443, // HTTPS
    465, // SMTPS
    587, // SMTP Submission
    993, // IMAPS
    995, // POP3S
    3306, // MySQL/MariaDB
    5432, // PostgreSQL
    6379, // Redis
    8130, // Custom SSH
  ]);

  validateUsername(username: string): ValidationResult {
    if (!username) {
      return { isValid: false, error: 'Username is required' };
    }

    // Check length
    if (username.length < 3 || username.length > 32) {
      return { isValid: false, error: 'Username must be 3-32 characters' };
    }

    // Must start with lowercase letter
    if (!/^[a-z]/.test(username)) {
      return { isValid: false, error: 'Username must start with a lowercase letter' };
    }

    // Only lowercase letters, numbers, underscore, and dash
    if (!/^[a-z][a-z0-9_-]*$/.test(username)) {
      return {
        isValid: false,
        error: 'Username can only contain lowercase letters, numbers, underscore, and dash',
      };
    }

    // Cannot end with dash or underscore
    if (/[-_]$/.test(username)) {
      return { isValid: false, error: 'Username cannot end with dash or underscore' };
    }

    // Check reserved names
    if (this.RESERVED_USERNAMES.has(username.toLowerCase())) {
      return { isValid: false, error: 'This username is reserved' };
    }

    return { isValid: true, sanitized: username.toLowerCase() };
  }

  validateDomainName(domain: string): ValidationResult {
    if (!domain) {
      return { isValid: false, error: 'Domain name is required' };
    }

    // Convert to lowercase and trim
    const sanitized = domain.toLowerCase().trim();

    // Check length
    if (sanitized.length > 253) {
      return { isValid: false, error: 'Domain name too long (max 253 characters)' };
    }

    // Split into labels
    const labels = sanitized.split('.');

    if (labels.length < 2) {
      return { isValid: false, error: 'Domain must have at least two parts (e.g., example.com)' };
    }

    for (const label of labels) {
      // Each label must be 1-63 characters
      if (label.length < 1 || label.length > 63) {
        return { isValid: false, error: 'Each domain label must be 1-63 characters' };
      }

      // Labels can only contain alphanumeric and hyphens
      if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(label) && label.length > 1) {
        return {
          isValid: false,
          error: 'Domain labels can only contain letters, numbers, and hyphens',
        };
      }

      // Single character labels must be alphanumeric
      if (label.length === 1 && !/^[a-z0-9]$/.test(label)) {
        return { isValid: false, error: 'Single character labels must be alphanumeric' };
      }
    }

    // TLD cannot be all numeric
    const tld = labels[labels.length - 1];
    if (/^\d+$/.test(tld)) {
      return { isValid: false, error: 'Top-level domain cannot be all numbers' };
    }

    return { isValid: true, sanitized };
  }

  validatePath(path: string, allowedBasePath: string): ValidationResult {
    if (!path) {
      return { isValid: false, error: 'Path is required' };
    }

    // Normalize the path
    const normalizedPath = this.normalizePath(path);
    const normalizedBasePath = this.normalizePath(allowedBasePath);

    // Check for path traversal attempts
    if (path.includes('..')) {
      return { isValid: false, error: 'Path traversal not allowed' };
    }

    // Check for null bytes
    if (path.includes('\0')) {
      return { isValid: false, error: 'Invalid characters in path' };
    }

    // Ensure path starts with allowed base path
    if (!normalizedPath.startsWith(normalizedBasePath)) {
      return { isValid: false, error: 'Path is outside allowed directory' };
    }

    // Check for dangerous characters
    if (/[<>:"|?*\x00-\x1f]/.test(path)) {
      return { isValid: false, error: 'Path contains invalid characters' };
    }

    return { isValid: true, sanitized: normalizedPath };
  }

  validatePort(port: number, checkReserved = true): ValidationResult {
    if (!Number.isInteger(port)) {
      return { isValid: false, error: 'Port must be an integer' };
    }

    if (port < 1 || port > 65535) {
      return { isValid: false, error: 'Port must be between 1 and 65535' };
    }

    if (checkReserved && this.RESERVED_PORTS.has(port)) {
      return { isValid: false, error: 'This port is reserved for system services' };
    }

    // Ports below 1024 require root
    if (port < 1024) {
      return { isValid: false, error: 'Ports below 1024 are reserved for system services' };
    }

    return { isValid: true, sanitized: String(port) };
  }

  validateEmail(email: string): ValidationResult {
    if (!email) {
      return { isValid: false, error: 'Email is required' };
    }

    const sanitized = email.toLowerCase().trim();

    // RFC 5322 compliant regex (simplified)
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!emailRegex.test(sanitized)) {
      return { isValid: false, error: 'Invalid email format' };
    }

    // Check length
    if (sanitized.length > 254) {
      return { isValid: false, error: 'Email too long' };
    }

    // Check local part length
    const [localPart] = sanitized.split('@');
    if (localPart.length > 64) {
      return { isValid: false, error: 'Email local part too long' };
    }

    return { isValid: true, sanitized };
  }

  validateDatabaseName(name: string): ValidationResult {
    if (!name) {
      return { isValid: false, error: 'Database name is required' };
    }

    const sanitized = name.toLowerCase();

    // Check length
    if (sanitized.length < 1 || sanitized.length > 64) {
      return { isValid: false, error: 'Database name must be 1-64 characters' };
    }

    // Must start with letter
    if (!/^[a-z]/.test(sanitized)) {
      return { isValid: false, error: 'Database name must start with a letter' };
    }

    // Only alphanumeric and underscore
    if (!/^[a-z][a-z0-9_]*$/.test(sanitized)) {
      return {
        isValid: false,
        error: 'Database name can only contain letters, numbers, and underscore',
      };
    }

    // Reserved database names
    const reserved = new Set([
      'mysql',
      'information_schema',
      'performance_schema',
      'sys',
      'test',
    ]);
    if (reserved.has(sanitized)) {
      return { isValid: false, error: 'This database name is reserved' };
    }

    return { isValid: true, sanitized };
  }

  validateIPv4(ip: string): ValidationResult {
    if (!ip) {
      return { isValid: false, error: 'IP address is required' };
    }

    const sanitized = ip.trim();
    const parts = sanitized.split('.');

    if (parts.length !== 4) {
      return { isValid: false, error: 'Invalid IPv4 format' };
    }

    for (const part of parts) {
      const num = parseInt(part, 10);
      if (isNaN(num) || num < 0 || num > 255 || String(num) !== part) {
        return { isValid: false, error: 'Invalid IPv4 address' };
      }
    }

    return { isValid: true, sanitized };
  }

  validateCronExpression(expression: string): ValidationResult {
    if (!expression) {
      return { isValid: false, error: 'Cron expression is required' };
    }

    const sanitized = expression.trim();
    const parts = sanitized.split(/\s+/);

    // Standard cron has 5 parts (minute hour day month weekday)
    if (parts.length !== 5) {
      return { isValid: false, error: 'Cron expression must have 5 fields' };
    }

    const patterns = [
      /^(\*|([0-5]?\d)([-,/]([0-5]?\d))*)$/, // minute (0-59)
      /^(\*|([01]?\d|2[0-3])([-,/]([01]?\d|2[0-3]))*)$/, // hour (0-23)
      /^(\*|([1-9]|[12]\d|3[01])([-,/]([1-9]|[12]\d|3[01]))*)$/, // day (1-31)
      /^(\*|([1-9]|1[0-2])([-,/]([1-9]|1[0-2]))*)$/, // month (1-12)
      /^(\*|[0-6]([-,/][0-6])*)$/, // weekday (0-6)
    ];

    for (let i = 0; i < 5; i++) {
      if (!patterns[i].test(parts[i])) {
        return { isValid: false, error: `Invalid cron field ${i + 1}` };
      }
    }

    return { isValid: true, sanitized };
  }

  sanitizeForShell(input: string): string {
    // Remove or escape potentially dangerous characters
    return input
      .replace(/[`$\\!"'<>|;&(){}[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizePath(path: string): string {
    // Remove duplicate slashes and resolve . but not ..
    return ('/' + path)
      .replace(/\/+/g, '/')
      .replace(/\/\.\//g, '/')
      .replace(/\/+$/, '') || '/';
  }
}
