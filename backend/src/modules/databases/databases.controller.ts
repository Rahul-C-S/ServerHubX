import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DatabasesService } from './databases.service.js';
import { CreateDatabaseDto } from './dto/create-database.dto.js';
import { CreateDatabaseUserDto, UpdateDatabaseUserDto } from './dto/create-database-user.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PoliciesGuard } from '../authorization/guards/policies.guard.js';
import { CheckPolicies } from '../authorization/decorators/check-policies.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { User } from '../users/entities/user.entity.js';
import type { Database } from './entities/database.entity.js';
import type { DatabaseUser } from './entities/database-user.entity.js';

@ApiTags('Databases')
@ApiBearerAuth('JWT-auth')
@Controller('databases')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class DatabasesController {
  constructor(private readonly databasesService: DatabasesService) {}

  @Get()
  @CheckPolicies((ability) => ability.can('read', 'Database'))
  async findAll(
    @CurrentUser() user: User,
    @Query('ownerId') ownerId?: string,
  ): Promise<Database[]> {
    // ROOT_ADMIN can see all, others only their own
    const effectiveOwnerId = user.role === 'ROOT_ADMIN' ? ownerId : user.id;
    return this.databasesService.findAll(effectiveOwnerId);
  }

  @Get(':id')
  @CheckPolicies((ability) => ability.can('read', 'Database'))
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Database> {
    return this.databasesService.findOne(id);
  }

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'Database'))
  async create(
    @Body() dto: CreateDatabaseDto,
    @CurrentUser() user: User,
  ): Promise<Database> {
    return this.databasesService.create(dto, user, user);
  }

  @Delete(':id')
  @CheckPolicies((ability) => ability.can('delete', 'Database'))
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean }> {
    await this.databasesService.delete(id, user);
    return { success: true };
  }

  @Post(':id/refresh-stats')
  @CheckPolicies((ability) => ability.can('read', 'Database'))
  async refreshStats(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Database> {
    return this.databasesService.updateStats(id);
  }

  // Database Users
  @Get(':id/users')
  @CheckPolicies((ability) => ability.can('read', 'Database'))
  async findUsers(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DatabaseUser[]> {
    return this.databasesService.findUsers(id);
  }

  @Post(':id/users')
  @CheckPolicies((ability) => ability.can('manage', 'Database'))
  async createUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateDatabaseUserDto,
  ): Promise<DatabaseUser> {
    return this.databasesService.createUser(id, dto);
  }

  @Patch(':id/users/:userId')
  @CheckPolicies((ability) => ability.can('manage', 'Database'))
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateDatabaseUserDto,
  ): Promise<DatabaseUser> {
    return this.databasesService.updateUser(id, userId, dto);
  }

  @Delete(':id/users/:userId')
  @CheckPolicies((ability) => ability.can('manage', 'Database'))
  async deleteUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<{ success: boolean }> {
    await this.databasesService.deleteUser(id, userId);
    return { success: true };
  }

  // Backup and Restore
  @Post(':id/backup')
  @CheckPolicies((ability) => ability.can('manage', 'Database'))
  async backup(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('outputPath') outputPath: string,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; path: string }> {
    return this.databasesService.backup(id, outputPath, user);
  }

  @Post(':id/restore')
  @CheckPolicies((ability) => ability.can('manage', 'Database'))
  async restore(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('inputPath') inputPath: string,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean }> {
    return this.databasesService.restore(id, inputPath, user);
  }

  @Post(':id/import')
  @CheckPolicies((ability) => ability.can('manage', 'Database'))
  async importSQL(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('sql') sql: string,
  ): Promise<{ success: boolean }> {
    return this.databasesService.importSQL(id, sql);
  }

  @Get(':id/export/:table')
  @CheckPolicies((ability) => ability.can('read', 'Database'))
  async exportTable(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('table') table: string,
    @Query('format') format: 'sql' | 'csv' = 'sql',
  ): Promise<{ success: boolean; data: string }> {
    return this.databasesService.exportTable(id, table, format);
  }
}
