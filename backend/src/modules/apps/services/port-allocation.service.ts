import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { CommandExecutorService } from '../../../core/executor/command-executor.service.js';
import { LoggerService } from '../../../common/logger/logger.service.js';
import { App } from '../entities/app.entity.js';

@Injectable()
export class PortAllocationService {
  private readonly MIN_PORT = 3000;
  private readonly MAX_PORT = 9999;
  private readonly RESERVED_PORTS = new Set([
    3306, // MySQL/MariaDB
    5432, // PostgreSQL
    6379, // Redis
    5672, // RabbitMQ
    8080, // Common alternative HTTP
    8443, // Common alternative HTTPS
  ]);

  constructor(
    @InjectRepository(App)
    private readonly appRepository: Repository<App>,
    private readonly commandExecutor: CommandExecutorService,
    private readonly logger: LoggerService,
  ) {}

  async allocatePort(preferredPort?: number): Promise<number> {
    // If a preferred port is specified, try to use it
    if (preferredPort) {
      if (await this.isPortAvailable(preferredPort)) {
        return preferredPort;
      }
      throw new ConflictException(`Port ${preferredPort} is not available`);
    }

    // Find an available port in the range
    const usedPorts = await this.getUsedPorts();

    for (let port = this.MIN_PORT; port <= this.MAX_PORT; port++) {
      if (
        !usedPorts.has(port) &&
        !this.RESERVED_PORTS.has(port) &&
        await this.isPortFree(port)
      ) {
        this.logger.log(`Allocated port: ${port}`, 'PortAllocationService');
        return port;
      }
    }

    throw new ConflictException('No available ports in the allowed range');
  }

  async releasePort(port: number): Promise<void> {
    // Port is automatically released when the app is deleted
    // This method is here for explicit release if needed
    this.logger.log(`Released port: ${port}`, 'PortAllocationService');
  }

  async isPortAvailable(port: number): Promise<boolean> {
    // Check if port is in valid range
    if (port < this.MIN_PORT || port > this.MAX_PORT) {
      return false;
    }

    // Check if port is reserved
    if (this.RESERVED_PORTS.has(port)) {
      return false;
    }

    // Check if port is already used by another app
    const usedPorts = await this.getUsedPorts();
    if (usedPorts.has(port)) {
      return false;
    }

    // Check if port is actually free on the system
    return this.isPortFree(port);
  }

  private async getUsedPorts(): Promise<Set<number>> {
    const apps = await this.appRepository.find({
      where: { port: Not(IsNull()) },
      select: ['port'],
    });

    return new Set(apps.map((app) => app.port!));
  }

  private async isPortFree(port: number): Promise<boolean> {
    // Check if any process is listening on the port
    const result = await this.commandExecutor.execute(
      'ss',
      ['-tlnp', `sport = :${port}`],
      { timeout: 5000 },
    );

    // If ss command returns empty output (just header), port is free
    const lines = result.stdout.trim().split('\n').filter(Boolean);
    return lines.length <= 1; // Only header line means port is free
  }

  async getPortRange(): Promise<{ min: number; max: number }> {
    return { min: this.MIN_PORT, max: this.MAX_PORT };
  }

  async getPortUsageStats(): Promise<{
    total: number;
    used: number;
    available: number;
    reserved: number;
  }> {
    const usedPorts = await this.getUsedPorts();
    const total = this.MAX_PORT - this.MIN_PORT + 1;
    const reserved = this.RESERVED_PORTS.size;
    const used = usedPorts.size;
    const available = total - used - reserved;

    return { total, used, available, reserved };
  }
}
