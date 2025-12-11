import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MailService } from './mail.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { User, UserRole } from '../users/entities/user.entity.js';
import { CreateMailDomainDto, UpdateMailDomainDto } from './dto/create-mail-domain.dto.js';
import { CreateMailboxDto, UpdateMailboxDto } from './dto/create-mailbox.dto.js';
import { CreateMailAliasDto, UpdateMailAliasDto } from './dto/create-mail-alias.dto.js';

@Controller('mail')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MailController {
  constructor(private readonly mailService: MailService) {}

  // ==================== Mail Domain Endpoints ====================

  @Get('domains')
  @Roles(UserRole.ROOT_ADMIN, UserRole.RESELLER)
  async listMailDomains() {
    return this.mailService.listMailDomains();
  }

  @Get('domains/:id')
  @Roles(UserRole.ROOT_ADMIN, UserRole.RESELLER, UserRole.DOMAIN_OWNER)
  async getMailDomain(@Param('id') id: string) {
    return this.mailService.getMailDomain(id);
  }

  @Post('domains/:domainId/enable')
  @Roles(UserRole.ROOT_ADMIN, UserRole.RESELLER)
  async enableMailForDomain(
    @Param('domainId') domainId: string,
    @Body() dto: CreateMailDomainDto,
    @CurrentUser() user: User,
  ) {
    return this.mailService.enableMailForDomain(domainId, dto, user);
  }

  @Put('domains/:id')
  @Roles(UserRole.ROOT_ADMIN, UserRole.RESELLER)
  async updateMailDomain(
    @Param('id') id: string,
    @Body() dto: UpdateMailDomainDto,
    @CurrentUser() user: User,
  ) {
    return this.mailService.updateMailDomain(id, dto, user);
  }

  @Delete('domains/:id')
  @Roles(UserRole.ROOT_ADMIN, UserRole.RESELLER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async disableMailForDomain(@Param('id') id: string, @CurrentUser() user: User) {
    await this.mailService.disableMailForDomain(id, user);
  }

  @Get('domains/:id/dns-records')
  @Roles(UserRole.ROOT_ADMIN, UserRole.RESELLER, UserRole.DOMAIN_OWNER)
  async getDnsRecords(@Param('id') id: string, @Query('serverIp') serverIp: string) {
    const [dkim, spf, dmarc] = await Promise.all([
      this.mailService.getDkimDnsRecord(id),
      this.mailService.getSpfDnsRecord(id, serverIp || '127.0.0.1'),
      this.mailService.getDmarcDnsRecord(id),
    ]);

    return {
      dkim,
      spf,
      dmarc,
    };
  }

  // ==================== Mailbox Endpoints ====================

  @Get('domains/:mailDomainId/mailboxes')
  @Roles(UserRole.ROOT_ADMIN, UserRole.RESELLER, UserRole.DOMAIN_OWNER)
  async listMailboxes(@Param('mailDomainId') mailDomainId: string) {
    return this.mailService.listMailboxes(mailDomainId);
  }

  @Get('mailboxes/:id')
  @Roles(UserRole.ROOT_ADMIN, UserRole.RESELLER, UserRole.DOMAIN_OWNER)
  async getMailbox(@Param('id') id: string) {
    return this.mailService.getMailbox(id);
  }

  @Post('domains/:mailDomainId/mailboxes')
  @Roles(UserRole.ROOT_ADMIN, UserRole.RESELLER, UserRole.DOMAIN_OWNER)
  async createMailbox(
    @Param('mailDomainId') mailDomainId: string,
    @Body() dto: CreateMailboxDto,
    @CurrentUser() user: User,
  ) {
    return this.mailService.createMailbox(mailDomainId, dto, user);
  }

  @Put('mailboxes/:id')
  @Roles(UserRole.ROOT_ADMIN, UserRole.RESELLER, UserRole.DOMAIN_OWNER)
  async updateMailbox(
    @Param('id') id: string,
    @Body() dto: UpdateMailboxDto,
    @CurrentUser() user: User,
  ) {
    return this.mailService.updateMailbox(id, dto, user);
  }

  @Delete('mailboxes/:id')
  @Roles(UserRole.ROOT_ADMIN, UserRole.RESELLER, UserRole.DOMAIN_OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMailbox(@Param('id') id: string, @CurrentUser() user: User) {
    await this.mailService.deleteMailbox(id, user);
  }

  // ==================== Mail Alias Endpoints ====================

  @Get('domains/:mailDomainId/aliases')
  @Roles(UserRole.ROOT_ADMIN, UserRole.RESELLER, UserRole.DOMAIN_OWNER)
  async listAliases(@Param('mailDomainId') mailDomainId: string) {
    return this.mailService.listAliases(mailDomainId);
  }

  @Post('domains/:mailDomainId/aliases')
  @Roles(UserRole.ROOT_ADMIN, UserRole.RESELLER, UserRole.DOMAIN_OWNER)
  async createAlias(
    @Param('mailDomainId') mailDomainId: string,
    @Body() dto: CreateMailAliasDto,
    @CurrentUser() user: User,
  ) {
    return this.mailService.createAlias(mailDomainId, dto, user);
  }

  @Put('aliases/:id')
  @Roles(UserRole.ROOT_ADMIN, UserRole.RESELLER, UserRole.DOMAIN_OWNER)
  async updateAlias(
    @Param('id') id: string,
    @Body() dto: UpdateMailAliasDto,
    @CurrentUser() user: User,
  ) {
    return this.mailService.updateAlias(id, dto, user);
  }

  @Delete('aliases/:id')
  @Roles(UserRole.ROOT_ADMIN, UserRole.RESELLER, UserRole.DOMAIN_OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAlias(@Param('id') id: string, @CurrentUser() user: User) {
    await this.mailService.deleteAlias(id, user);
  }

  // ==================== Service Status ====================

  @Get('status')
  @Roles(UserRole.ROOT_ADMIN)
  async getMailServiceStatus() {
    return this.mailService.getMailServiceStatus();
  }
}
