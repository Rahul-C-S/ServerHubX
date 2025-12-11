import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Database, DatabaseStatus, DatabaseType } from './entities/database.entity.js';
import { DatabaseUser, DatabasePrivilege } from './entities/database-user.entity.js';
import { MariaDBService } from './services/mariadb.service.js';
import { LoggerService } from '../../common/logger/logger.service.js';
import { AuditLoggerService } from '../../core/audit/audit-logger.service.js';
import { CreateDatabaseDto } from './dto/create-database.dto.js';
import { CreateDatabaseUserDto, UpdateDatabaseUserDto } from './dto/create-database-user.dto.js';
import { AuditOperationType, AuditResourceType } from '../../core/audit/entities/audit-log.entity.js';
import type { User } from '../users/entities/user.entity.js';

@Injectable()
export class DatabasesService {
  constructor(
    @InjectRepository(Database)
    private readonly databaseRepository: Repository<Database>,
    @InjectRepository(DatabaseUser)
    private readonly databaseUserRepository: Repository<DatabaseUser>,
    private readonly mariaDBService: MariaDBService,
    private readonly logger: LoggerService,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  async findAll(ownerId?: string): Promise<Database[]> {
    const query = this.databaseRepository
      .createQueryBuilder('db')
      .leftJoinAndSelect('db.owner', 'owner')
      .leftJoinAndSelect('db.domain', 'domain')
      .leftJoinAndSelect('db.users', 'users');

    if (ownerId) {
      query.where('db.ownerId = :ownerId', { ownerId });
    }

    return query.orderBy('db.createdAt', 'DESC').getMany();
  }

  async findOne(id: string): Promise<Database> {
    const database = await this.databaseRepository.findOne({
      where: { id },
      relations: ['owner', 'domain', 'users'],
    });

    if (!database) {
      throw new NotFoundException(`Database with ID ${id} not found`);
    }

    return database;
  }

  async findByName(name: string): Promise<Database | null> {
    return this.databaseRepository.findOne({
      where: { name },
      relations: ['owner', 'domain', 'users'],
    });
  }

  async create(
    dto: CreateDatabaseDto,
    owner: User,
    performedBy: User,
  ): Promise<Database> {
    // Check if database name already exists
    const existing = await this.findByName(dto.name);
    if (existing) {
      throw new ConflictException(`Database "${dto.name}" already exists`);
    }

    // Create database in MariaDB
    const createResult = await this.mariaDBService.createDatabase(
      dto.name,
      dto.charset || 'utf8mb4',
      dto.collation || 'utf8mb4_unicode_ci',
    );

    if (!createResult.success) {
      throw new BadRequestException(`Failed to create database: ${createResult.error}`);
    }

    // Create database record
    const database = this.databaseRepository.create({
      name: dto.name,
      type: dto.type || DatabaseType.MARIADB,
      status: DatabaseStatus.ACTIVE,
      charset: dto.charset || 'utf8mb4',
      collation: dto.collation || 'utf8mb4_unicode_ci',
      description: dto.description,
      ownerId: owner.id,
      domainId: dto.domainId,
    });

    await this.databaseRepository.save(database);

    // Create initial user if provided
    if (dto.initialUsername && dto.initialPassword) {
      await this.createUser(database.id, {
        username: dto.initialUsername,
        password: dto.initialPassword,
        privileges: [DatabasePrivilege.ALL],
      });
    }

    // Audit log
    await this.auditLogger.log({
      operationType: AuditOperationType.CREATE,
      resourceType: AuditResourceType.DATABASE,
      resourceId: database.id,
      resourceName: database.name,
      description: `Created database ${database.name}`,
      metadata: { type: database.type },
    }, { userId: performedBy.id });

    this.logger.log(`Created database: ${database.name}`, 'DatabasesService');

    return this.findOne(database.id);
  }

  async delete(id: string, performedBy: User): Promise<void> {
    const database = await this.findOne(id);

    // Drop all users first
    for (const dbUser of database.users) {
      await this.mariaDBService.dropUser(dbUser.username, dbUser.host);
    }

    // Drop the database
    const dropResult = await this.mariaDBService.dropDatabase(database.name);
    if (!dropResult.success) {
      throw new BadRequestException(`Failed to drop database: ${dropResult.error}`);
    }

    // Delete from database
    await this.databaseRepository.remove(database);

    // Audit log
    await this.auditLogger.log({
      operationType: AuditOperationType.DELETE,
      resourceType: AuditResourceType.DATABASE,
      resourceId: id,
      resourceName: database.name,
      description: `Deleted database ${database.name}`,
    }, { userId: performedBy.id });

    this.logger.log(`Deleted database: ${database.name}`, 'DatabasesService');
  }

  async updateStats(id: string): Promise<Database> {
    const database = await this.findOne(id);

    const info = await this.mariaDBService.getDatabaseInfo(database.name);
    if (info) {
      database.sizeBytes = info.sizeBytes;
      database.tableCount = info.tableCount;
      await this.databaseRepository.save(database);
    }

    return database;
  }

  // Database User Methods
  async findUsers(databaseId: string): Promise<DatabaseUser[]> {
    return this.databaseUserRepository.find({
      where: { databaseId },
      order: { createdAt: 'DESC' },
    });
  }

  async findUser(databaseId: string, userId: string): Promise<DatabaseUser> {
    const user = await this.databaseUserRepository.findOne({
      where: { id: userId, databaseId },
    });

    if (!user) {
      throw new NotFoundException(`Database user with ID ${userId} not found`);
    }

    return user;
  }

  async createUser(databaseId: string, dto: CreateDatabaseUserDto): Promise<DatabaseUser> {
    const database = await this.findOne(databaseId);

    // Check if user already exists
    const existing = await this.databaseUserRepository.findOne({
      where: { username: dto.username, host: dto.host || 'localhost' },
    });

    if (existing) {
      throw new ConflictException(`User "${dto.username}@${dto.host || 'localhost'}" already exists`);
    }

    // Create user in MariaDB
    const createResult = await this.mariaDBService.createUser(
      dto.username,
      dto.password,
      dto.host || 'localhost',
    );

    if (!createResult.success) {
      throw new BadRequestException(`Failed to create user: ${createResult.error}`);
    }

    // Grant privileges
    const privileges = dto.privileges || [DatabasePrivilege.ALL];
    const grantResult = await this.mariaDBService.grantPrivileges(
      dto.username,
      dto.host || 'localhost',
      database.name,
      privileges,
      dto.canGrant,
    );

    if (!grantResult.success) {
      // Rollback: drop the user
      await this.mariaDBService.dropUser(dto.username, dto.host || 'localhost');
      throw new BadRequestException(`Failed to grant privileges: ${grantResult.error}`);
    }

    // Set user limits if specified
    if (dto.maxConnections || dto.maxQueriesPerHour || dto.maxUpdatesPerHour || dto.maxConnectionsPerHour) {
      await this.mariaDBService.setUserLimits(dto.username, dto.host || 'localhost', {
        maxConnections: dto.maxConnections,
        maxQueriesPerHour: dto.maxQueriesPerHour,
        maxUpdatesPerHour: dto.maxUpdatesPerHour,
        maxConnectionsPerHour: dto.maxConnectionsPerHour,
      });
    }

    // Create user record
    const dbUser = this.databaseUserRepository.create({
      username: dto.username,
      passwordHash: this.hashPassword(dto.password),
      host: dto.host || 'localhost',
      privileges: privileges,
      canGrant: dto.canGrant || false,
      databaseId: database.id,
      maxConnections: dto.maxConnections || 0,
      maxQueriesPerHour: dto.maxQueriesPerHour || 0,
      maxUpdatesPerHour: dto.maxUpdatesPerHour || 0,
      maxConnectionsPerHour: dto.maxConnectionsPerHour || 0,
    });

    await this.databaseUserRepository.save(dbUser);

    this.logger.log(`Created database user: ${dto.username}@${dto.host || 'localhost'}`, 'DatabasesService');

    return dbUser;
  }

  async updateUser(
    databaseId: string,
    userId: string,
    dto: UpdateDatabaseUserDto,
  ): Promise<DatabaseUser> {
    const database = await this.findOne(databaseId);
    const dbUser = await this.findUser(databaseId, userId);

    // Update password if provided
    if (dto.password) {
      const resetResult = await this.mariaDBService.resetPassword(
        dbUser.username,
        dbUser.host,
        dto.password,
      );

      if (!resetResult.success) {
        throw new BadRequestException(`Failed to reset password: ${resetResult.error}`);
      }

      dbUser.passwordHash = this.hashPassword(dto.password);
    }

    // Update privileges if provided
    if (dto.privileges) {
      // Revoke existing privileges
      await this.mariaDBService.revokePrivileges(
        dbUser.username,
        dbUser.host,
        database.name,
        [DatabasePrivilege.ALL],
      );

      // Grant new privileges
      const grantResult = await this.mariaDBService.grantPrivileges(
        dbUser.username,
        dbUser.host,
        database.name,
        dto.privileges,
        dto.canGrant,
      );

      if (!grantResult.success) {
        throw new BadRequestException(`Failed to update privileges: ${grantResult.error}`);
      }

      dbUser.privileges = dto.privileges;
    }

    if (dto.canGrant !== undefined) {
      dbUser.canGrant = dto.canGrant;
    }

    // Update limits
    const limits: Record<string, number | undefined> = {};
    if (dto.maxConnections !== undefined) {
      limits.maxConnections = dto.maxConnections;
      dbUser.maxConnections = dto.maxConnections;
    }
    if (dto.maxQueriesPerHour !== undefined) {
      limits.maxQueriesPerHour = dto.maxQueriesPerHour;
      dbUser.maxQueriesPerHour = dto.maxQueriesPerHour;
    }
    if (dto.maxUpdatesPerHour !== undefined) {
      limits.maxUpdatesPerHour = dto.maxUpdatesPerHour;
      dbUser.maxUpdatesPerHour = dto.maxUpdatesPerHour;
    }
    if (dto.maxConnectionsPerHour !== undefined) {
      limits.maxConnectionsPerHour = dto.maxConnectionsPerHour;
      dbUser.maxConnectionsPerHour = dto.maxConnectionsPerHour;
    }

    if (Object.keys(limits).length > 0) {
      await this.mariaDBService.setUserLimits(dbUser.username, dbUser.host, limits);
    }

    await this.databaseUserRepository.save(dbUser);

    this.logger.log(`Updated database user: ${dbUser.username}@${dbUser.host}`, 'DatabasesService');

    return dbUser;
  }

  async deleteUser(databaseId: string, userId: string): Promise<void> {
    const dbUser = await this.findUser(databaseId, userId);

    // Drop user from MariaDB
    const dropResult = await this.mariaDBService.dropUser(dbUser.username, dbUser.host);

    if (!dropResult.success) {
      throw new BadRequestException(`Failed to drop user: ${dropResult.error}`);
    }

    await this.databaseUserRepository.remove(dbUser);

    this.logger.log(`Deleted database user: ${dbUser.username}@${dbUser.host}`, 'DatabasesService');
  }

  // Backup and Restore Methods
  async backup(id: string, outputPath: string, performedBy: User): Promise<{ success: boolean; path: string }> {
    const database = await this.findOne(id);

    const result = await this.mariaDBService.backupDatabase(database.name, outputPath);

    if (!result.success) {
      throw new BadRequestException(`Backup failed: ${result.error}`);
    }

    database.lastBackupAt = new Date();
    await this.databaseRepository.save(database);

    // Audit log
    await this.auditLogger.log({
      operationType: AuditOperationType.BACKUP,
      resourceType: AuditResourceType.DATABASE,
      resourceId: database.id,
      resourceName: database.name,
      description: `Backed up database ${database.name}`,
      metadata: { path: outputPath },
    }, { userId: performedBy.id });

    return { success: true, path: outputPath };
  }

  async restore(id: string, inputPath: string, performedBy: User): Promise<{ success: boolean }> {
    const database = await this.findOne(id);

    const result = await this.mariaDBService.restoreDatabase(database.name, inputPath);

    if (!result.success) {
      throw new BadRequestException(`Restore failed: ${result.error}`);
    }

    // Audit log
    await this.auditLogger.log({
      operationType: AuditOperationType.RESTORE,
      resourceType: AuditResourceType.DATABASE,
      resourceId: database.id,
      resourceName: database.name,
      description: `Restored database ${database.name}`,
      metadata: { path: inputPath },
    }, { userId: performedBy.id });

    return { success: true };
  }

  async importSQL(id: string, sql: string): Promise<{ success: boolean }> {
    const database = await this.findOne(id);

    const result = await this.mariaDBService.importSQL(database.name, sql);

    if (!result.success) {
      throw new BadRequestException(`Import failed: ${result.error}`);
    }

    return { success: true };
  }

  async exportTable(
    id: string,
    table: string,
    format: 'sql' | 'csv' = 'sql',
  ): Promise<{ success: boolean; data: string }> {
    const database = await this.findOne(id);

    const result = await this.mariaDBService.exportTable(database.name, table, format);

    if (!result.success || !result.data) {
      throw new BadRequestException(`Export failed: ${result.error}`);
    }

    return { success: true, data: result.data };
  }

  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }
}
