import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CronService } from './cron.service';
import { CreateCronJobDto, UpdateCronJobDto } from './dto/cron.dto';
import type { User } from '../users/entities/user.entity';

@ApiTags('Cron')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard)
export class CronController {
  constructor(private readonly cronService: CronService) {}

  @Get('cron')
  async findAll(@Query('domainId') domainId?: string) {
    return this.cronService.findAll(domainId);
  }

  @Get('domains/:domainId/cron')
  async findByDomain(@Param('domainId') domainId: string) {
    return this.cronService.findAll(domainId);
  }

  @Post('domains/:domainId/cron')
  async create(
    @Param('domainId') domainId: string,
    @Body() dto: Omit<CreateCronJobDto, 'domainId'>,
    @CurrentUser() user: User,
  ) {
    return this.cronService.create({ ...dto, domainId }, user);
  }

  @Get('cron/:id')
  async findOne(@Param('id') id: string) {
    return this.cronService.findOne(id);
  }

  @Patch('cron/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCronJobDto,
    @CurrentUser() user: User,
  ) {
    return this.cronService.update(id, dto, user);
  }

  @Delete('cron/:id')
  async delete(@Param('id') id: string, @CurrentUser() user: User) {
    await this.cronService.delete(id, user);
    return { success: true };
  }

  @Post('cron/:id/run')
  async runNow(@Param('id') id: string, @CurrentUser() user: User) {
    return this.cronService.runNow(id, user);
  }

  @Get('cron/validate/:expression')
  async validateExpression(@Param('expression') expression: string) {
    const decoded = decodeURIComponent(expression);
    return {
      valid: this.cronService.validateCronExpression(decoded),
      nextRun: this.cronService.calculateNextRun(decoded),
      description: this.cronService.describeCronExpression(decoded),
    };
  }
}
