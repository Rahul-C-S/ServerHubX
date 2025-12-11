"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InputValidatorService = void 0;
const common_1 = require("@nestjs/common");
let InputValidatorService = class InputValidatorService {
    RESERVED_USERNAMES = new Set([
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
    RESERVED_PORTS = new Set([
        22,
        25,
        53,
        80,
        110,
        143,
        443,
        465,
        587,
        993,
        995,
        3306,
        5432,
        6379,
        8130,
    ]);
    validateUsername(username) {
        if (!username) {
            return { isValid: false, error: 'Username is required' };
        }
        if (username.length < 3 || username.length > 32) {
            return { isValid: false, error: 'Username must be 3-32 characters' };
        }
        if (!/^[a-z]/.test(username)) {
            return { isValid: false, error: 'Username must start with a lowercase letter' };
        }
        if (!/^[a-z][a-z0-9_-]*$/.test(username)) {
            return {
                isValid: false,
                error: 'Username can only contain lowercase letters, numbers, underscore, and dash',
            };
        }
        if (/[-_]$/.test(username)) {
            return { isValid: false, error: 'Username cannot end with dash or underscore' };
        }
        if (this.RESERVED_USERNAMES.has(username.toLowerCase())) {
            return { isValid: false, error: 'This username is reserved' };
        }
        return { isValid: true, sanitized: username.toLowerCase() };
    }
    validateDomainName(domain) {
        if (!domain) {
            return { isValid: false, error: 'Domain name is required' };
        }
        const sanitized = domain.toLowerCase().trim();
        if (sanitized.length > 253) {
            return { isValid: false, error: 'Domain name too long (max 253 characters)' };
        }
        const labels = sanitized.split('.');
        if (labels.length < 2) {
            return { isValid: false, error: 'Domain must have at least two parts (e.g., example.com)' };
        }
        for (const label of labels) {
            if (label.length < 1 || label.length > 63) {
                return { isValid: false, error: 'Each domain label must be 1-63 characters' };
            }
            if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(label) && label.length > 1) {
                return {
                    isValid: false,
                    error: 'Domain labels can only contain letters, numbers, and hyphens',
                };
            }
            if (label.length === 1 && !/^[a-z0-9]$/.test(label)) {
                return { isValid: false, error: 'Single character labels must be alphanumeric' };
            }
        }
        const tld = labels[labels.length - 1];
        if (/^\d+$/.test(tld)) {
            return { isValid: false, error: 'Top-level domain cannot be all numbers' };
        }
        return { isValid: true, sanitized };
    }
    validatePath(path, allowedBasePath) {
        if (!path) {
            return { isValid: false, error: 'Path is required' };
        }
        const normalizedPath = this.normalizePath(path);
        const normalizedBasePath = this.normalizePath(allowedBasePath);
        if (path.includes('..')) {
            return { isValid: false, error: 'Path traversal not allowed' };
        }
        if (path.includes('\0')) {
            return { isValid: false, error: 'Invalid characters in path' };
        }
        if (!normalizedPath.startsWith(normalizedBasePath)) {
            return { isValid: false, error: 'Path is outside allowed directory' };
        }
        if (/[<>:"|?*\x00-\x1f]/.test(path)) {
            return { isValid: false, error: 'Path contains invalid characters' };
        }
        return { isValid: true, sanitized: normalizedPath };
    }
    validatePort(port, checkReserved = true) {
        if (!Number.isInteger(port)) {
            return { isValid: false, error: 'Port must be an integer' };
        }
        if (port < 1 || port > 65535) {
            return { isValid: false, error: 'Port must be between 1 and 65535' };
        }
        if (checkReserved && this.RESERVED_PORTS.has(port)) {
            return { isValid: false, error: 'This port is reserved for system services' };
        }
        if (port < 1024) {
            return { isValid: false, error: 'Ports below 1024 are reserved for system services' };
        }
        return { isValid: true, sanitized: String(port) };
    }
    validateEmail(email) {
        if (!email) {
            return { isValid: false, error: 'Email is required' };
        }
        const sanitized = email.toLowerCase().trim();
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!emailRegex.test(sanitized)) {
            return { isValid: false, error: 'Invalid email format' };
        }
        if (sanitized.length > 254) {
            return { isValid: false, error: 'Email too long' };
        }
        const [localPart] = sanitized.split('@');
        if (localPart.length > 64) {
            return { isValid: false, error: 'Email local part too long' };
        }
        return { isValid: true, sanitized };
    }
    validateDatabaseName(name) {
        if (!name) {
            return { isValid: false, error: 'Database name is required' };
        }
        const sanitized = name.toLowerCase();
        if (sanitized.length < 1 || sanitized.length > 64) {
            return { isValid: false, error: 'Database name must be 1-64 characters' };
        }
        if (!/^[a-z]/.test(sanitized)) {
            return { isValid: false, error: 'Database name must start with a letter' };
        }
        if (!/^[a-z][a-z0-9_]*$/.test(sanitized)) {
            return {
                isValid: false,
                error: 'Database name can only contain letters, numbers, and underscore',
            };
        }
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
    validateIPv4(ip) {
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
    validateCronExpression(expression) {
        if (!expression) {
            return { isValid: false, error: 'Cron expression is required' };
        }
        const sanitized = expression.trim();
        const parts = sanitized.split(/\s+/);
        if (parts.length !== 5) {
            return { isValid: false, error: 'Cron expression must have 5 fields' };
        }
        const patterns = [
            /^(\*|([0-5]?\d)([-,/]([0-5]?\d))*)$/,
            /^(\*|([01]?\d|2[0-3])([-,/]([01]?\d|2[0-3]))*)$/,
            /^(\*|([1-9]|[12]\d|3[01])([-,/]([1-9]|[12]\d|3[01]))*)$/,
            /^(\*|([1-9]|1[0-2])([-,/]([1-9]|1[0-2]))*)$/,
            /^(\*|[0-6]([-,/][0-6])*)$/,
        ];
        for (let i = 0; i < 5; i++) {
            if (!patterns[i].test(parts[i])) {
                return { isValid: false, error: `Invalid cron field ${i + 1}` };
            }
        }
        return { isValid: true, sanitized };
    }
    sanitizeForShell(input) {
        return input
            .replace(/[`$\\!"'<>|;&(){}[\]]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    normalizePath(path) {
        return ('/' + path)
            .replace(/\/+/g, '/')
            .replace(/\/\.\//g, '/')
            .replace(/\/+$/, '') || '/';
    }
};
exports.InputValidatorService = InputValidatorService;
exports.InputValidatorService = InputValidatorService = __decorate([
    (0, common_1.Injectable)()
], InputValidatorService);
//# sourceMappingURL=input-validator.service.js.map