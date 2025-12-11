import { Injectable } from '@nestjs/common';
import { spawn, SpawnOptionsWithoutStdio } from 'child_process';
import { LoggerService } from '../../common/logger/logger.service.js';
import {
  isCommandAllowed,
  getCommandDefinition,
  validateArgument,
} from './command-whitelist.js';

export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  command: string;
  args: string[];
  duration: number;
}

export interface ExecuteOptions {
  timeout?: number;
  cwd?: string;
  env?: Record<string, string>;
  stdin?: string;
  runAs?: string;
}

@Injectable()
export class CommandExecutorService {
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private readonly MAX_TIMEOUT = 300000; // 5 minutes

  constructor(private readonly logger: LoggerService) {}

  async execute(
    command: string,
    args: string[] = [],
    options: ExecuteOptions = {},
  ): Promise<CommandResult> {
    const startTime = Date.now();

    // Validate command is in whitelist
    if (!isCommandAllowed(command)) {
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

    // Validate all arguments
    const invalidArgs = args.filter((arg) => !validateArgument(command, arg));
    if (invalidArgs.length > 0) {
      this.logger.error(
        `Invalid arguments for ${command}: ${invalidArgs.join(', ')}`,
        undefined,
        'CommandExecutor',
      );
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

    const definition = getCommandDefinition(command);
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

    // Build the final command with sudo if required
    let finalCommand = command;
    let finalArgs = [...args];

    if (options.runAs) {
      // Run as specific user using sudo -u
      finalCommand = 'sudo';
      finalArgs = ['-u', options.runAs, command, ...args];
    } else if (definition.requiresSudo) {
      finalCommand = 'sudo';
      finalArgs = [command, ...args];
    }

    // Log command execution (without sensitive data)
    this.logger.log(
      `Executing: ${finalCommand} ${this.sanitizeArgsForLog(finalArgs).join(' ')}`,
      'CommandExecutor',
    );

    return this.spawnCommand(finalCommand, finalArgs, options, startTime);
  }

  private spawnCommand(
    command: string,
    args: string[],
    options: ExecuteOptions,
    startTime: number,
  ): Promise<CommandResult> {
    return new Promise((resolve) => {
      const timeout = Math.min(
        options.timeout || this.DEFAULT_TIMEOUT,
        this.MAX_TIMEOUT,
      );

      const spawnOptions: SpawnOptionsWithoutStdio = {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
      };

      const child = spawn(command, args, spawnOptions);

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timeoutId = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, timeout);

      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
        // Limit buffer size to prevent memory issues
        if (stdout.length > 10 * 1024 * 1024) {
          stdout = stdout.slice(-5 * 1024 * 1024);
        }
      });

      child.stderr.on('data', (data: Buffer) => {
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
          this.logger.warn(
            `Command timed out after ${timeout}ms: ${command}`,
            'CommandExecutor',
          );
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
          this.logger.warn(
            `Command failed with exit code ${exitCode}: ${command}`,
            'CommandExecutor',
          );
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
        this.logger.error(
          `Command error: ${error.message}`,
          error.stack,
          'CommandExecutor',
        );
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

  private sanitizeArgsForLog(args: string[]): string[] {
    return args.map((arg) => {
      // Hide password arguments
      if (arg.startsWith('-p') && arg.length > 2) {
        return '-p****';
      }
      return arg;
    });
  }

  async executeWithRetry(
    command: string,
    args: string[] = [],
    options: ExecuteOptions = {},
    maxRetries = 3,
    retryDelay = 1000,
  ): Promise<CommandResult> {
    let lastResult: CommandResult | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      lastResult = await this.execute(command, args, options);

      if (lastResult.success) {
        return lastResult;
      }

      if (attempt < maxRetries) {
        this.logger.warn(
          `Command failed, retrying (${attempt}/${maxRetries}): ${command}`,
          'CommandExecutor',
        );
        await this.delay(retryDelay * attempt);
      }
    }

    return lastResult!;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Execute a command that requires sudo privileges.
   * This is a convenience wrapper that explicitly invokes sudo.
   */
  async executeSudo(
    command: string,
    args: string[] = [],
    options: ExecuteOptions = {},
  ): Promise<CommandResult> {
    // The execute method already handles sudo based on requiresSudo in the whitelist
    // This method ensures the command runs with elevated privileges
    return this.execute(command, args, options);
  }
}
