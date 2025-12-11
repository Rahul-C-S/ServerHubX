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
  Res,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BackupsService } from './backups.service';
import {
  CreateBackupDto,
  CreateScheduleDto,
  UpdateScheduleDto,
  RestoreBackupDto,
} from './dto/backups.dto';
import type { User } from '../users/entities/user.entity';

@ApiTags('Backups')
@ApiBearerAuth('JWT-auth')
@Controller('backups')
@UseGuards(JwtAuthGuard)
export class BackupsController {
  constructor(private readonly backupsService: BackupsService) {}

  @Get()
  async findAll(@Query('domainId') domainId?: string) {
    return this.backupsService.findAll(domainId);
  }

  @Post()
  async create(@Body() dto: CreateBackupDto, @CurrentUser() user: User) {
    return this.backupsService.create(dto, user);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.backupsService.findOne(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: User) {
    await this.backupsService.delete(id, user);
    return { success: true };
  }

  @Post(':id/restore')
  async restore(
    @Param('id') id: string,
    @Body() dto: RestoreBackupDto,
    @CurrentUser() user: User,
  ) {
    return this.backupsService.restore(id, dto, user);
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const filePath = await this.backupsService.getDownloadUrl(id);
    const filename = path.basename(filePath);

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/gzip');

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }

  // Schedule endpoints
  @Get('schedules')
  async findAllSchedules(@Query('domainId') domainId?: string) {
    return this.backupsService.findAllSchedules(domainId);
  }

  @Post('schedules')
  async createSchedule(@Body() dto: CreateScheduleDto, @CurrentUser() user: User) {
    return this.backupsService.createSchedule(dto, user);
  }

  @Get('schedules/:id')
  async findSchedule(@Param('id') id: string) {
    return this.backupsService.findSchedule(id);
  }

  @Patch('schedules/:id')
  async updateSchedule(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
    @CurrentUser() user: User,
  ) {
    return this.backupsService.updateSchedule(id, dto, user);
  }

  @Delete('schedules/:id')
  async deleteSchedule(@Param('id') id: string, @CurrentUser() user: User) {
    await this.backupsService.deleteSchedule(id, user);
    return { success: true };
  }
}
