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
exports.CommandExecutorService = void 0;
const common_1 = require("@nestjs/common");
const child_process_1 = require("child_process");
const logger_service_js_1 = require("../../common/logger/logger.service.js");
const command_whitelist_js_1 = require("./command-whitelist.js");
let CommandExecutorService = class CommandExecutorService {
    logger;
    DEFAULT_TIMEOUT = 30000;
    MAX_TIMEOUT = 300000;
    constructor(logger) {
        this.logger = logger;
    }
    async execute(command, args = [], options = {}) {
        const startTime = Date.now();
        if (!(0, command_whitelist_js_1.isCommandAllowed)(command)) {
            this.logger.error(`Command not allowed: ${command}`, undefined, 'CommandExecutor');
            return {
                success: false,
                stdout: '',
                stderr: `Command "${command}" is not in the allowed command whitelist`,
                exitCode: 1,
                command,
                args,
                duration: Date.now() - startTime,
            };
        }
        const invalidArgs = args.filter((arg) => !(0, command_whitelist_js_1.validateArgument)(command, arg));
        if (invalidArgs.length > 0) {
            this.logger.error(`Invalid arguments for ${command}: ${invalidArgs.join(', ')}`, undefined, 'CommandExecutor');
            return {
                success: false,
                stdout: '',
                stderr: `Invalid arguments: ${invalidArgs.join(', ')}`,
                exitCode: 1,
                command,
                args,
                duration: Date.now() - startTime,
            };
        }
        const definition = (0, command_whitelist_js_1.getCommandDefinition)(command);
        if (!definition) {
            return {
                success: false,
                stdout: '',
                stderr: `Command definition not found for: ${command}`,
                exitCode: 1,
                command,
                args,
                duration: Date.now() - startTime,
            };
        }
        let finalCommand = command;
        let finalArgs = [...args];
        if (options.runAs) {
            finalCommand = 'sudo';
            finalArgs = ['-u', options.runAs, command, ...args];
        }
        else if (definition.requiresSudo) {
            finalCommand = 'sudo';
            finalArgs = [command, ...args];
        }
        this.logger.log(`Executing: ${finalCommand} ${this.sanitizeArgsForLog(finalArgs).join(' ')}`, 'CommandExecutor');
        return this.spawnCommand(finalCommand, finalArgs, options, startTime);
    }
    spawnCommand(command, args, options, startTime) {
        return new Promise((resolve) => {
            const timeout = Math.min(options.timeout || this.DEFAULT_TIMEOUT, this.MAX_TIMEOUT);
            const spawnOptions = {
                cwd: options.cwd,
                env: { ...process.env, ...options.env },
            };
            const child = (0, child_process_1.spawn)(command, args, spawnOptions);
            let stdout = '';
            let stderr = '';
            let timedOut = false;
            const timeoutId = setTimeout(() => {
                timedOut = true;
                child.kill('SIGKILL');
            }, timeout);
            child.stdout.on('data', (data) => {
                stdout += data.toString();
                if (stdout.length > 10 * 1024 * 1024) {
                    stdout = stdout.slice(-5 * 1024 * 1024);
                }
            });
            child.stderr.on('data', (data) => {
                stderr += data.toString();
                if (stderr.length > 10 * 1024 * 1024) {
                    stderr = stderr.slice(-5 * 1024 * 1024);
                }
            });
            if (options.stdin) {
                child.stdin.write(options.stdin);
                child.stdin.end();
            }
            child.on('close', (exitCode) => {
                clearTimeout(timeoutId);
                const duration = Date.now() - startTime;
                if (timedOut) {
                    this.logger.warn(`Command timed out after ${timeout}ms: ${command}`, 'CommandExecutor');
                    resolve({
                        success: false,
                        stdout,
                        stderr: `Command timed out after ${timeout}ms\n${stderr}`,
                        exitCode: null,
                        command,
                        args,
                        duration,
                    });
                    return;
                }
                const success = exitCode === 0;
                if (!success) {
                    this.logger.warn(`Command failed with exit code ${exitCode}: ${command}`, 'CommandExecutor');
                }
                resolve({
                    success,
                    stdout,
                    stderr,
                    exitCode,
                    command,
                    args,
                    duration,
                });
            });
            child.on('error', (error) => {
                clearTimeout(timeoutId);
                this.logger.error(`Command error: ${error.message}`, error.stack, 'CommandExecutor');
                resolve({
                    success: false,
                    stdout,
                    stderr: error.message,
                    exitCode: null,
                    command,
                    args,
                    duration: Date.now() - startTime,
                });
            });
        });
    }
    sanitizeArgsForLog(args) {
        return args.map((arg) => {
            if (arg.startsWith('-p') && arg.length > 2) {
                return '-p****';
            }
            return arg;
        });
    }
    async executeWithRetry(command, args = [], options = {}, maxRetries = 3, retryDelay = 1000) {
        let lastResult = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            lastResult = await this.execute(command, args, options);
            if (lastResult.success) {
                return lastResult;
            }
            if (attempt < maxRetries) {
                this.logger.warn(`Command failed, retrying (${attempt}/${maxRetries}): ${command}`, 'CommandExecutor');
                await this.delay(retryDelay * attempt);
            }
        }
        return lastResult;
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.CommandExecutorService = CommandExecutorService;
exports.CommandExecutorService = CommandExecutorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [logger_service_js_1.LoggerService])
], CommandExecutorService);
//# sourceMappingURL=command-executor.service.js.map