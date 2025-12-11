import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../users/entities/user.entity.js';
import { SslService } from './ssl.service.js';
import {
  RequestCertificateDto,
  UploadCertificateDto,
  RenewCertificateDto,
} from './dto/request-certificate.dto.js';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class SslController {
  constructor(private readonly sslService: SslService) {}

  @Get('ssl/certificates')
  @Roles(UserRole.ROOT_ADMIN)
  async findAll() {
    const certificates = await this.sslService.findAll();
    return certificates.map((cert) => this.sanitizeCertificate(cert));
  }

  @Get('ssl/certificates/expiring')
  @Roles(UserRole.ROOT_ADMIN)
  async findExpiring() {
    const certificates = await this.sslService.findExpiring();
    return certificates.map((cert) => this.sanitizeCertificate(cert));
  }

  @Get('domains/:domainId/ssl')
  @Roles(UserRole.ROOT_ADMIN, UserRole.RESELLER, UserRole.DOMAIN_OWNER)
  async findByDomain(@Param('domainId', ParseUUIDPipe) domainId: string) {
    const certificate = await this.sslService.findByDomain(domainId);
    if (!certificate) {
      return null;
    }
    return this.sanitizeCertificate(certificate);
  }

  @Post('domains/:domainId/ssl/request')
  @Roles(UserRole.ROOT_ADMIN, UserRole.RESELLER, UserRole.DOMAIN_OWNER)
  async requestCertificate(
    @Param('domainId', ParseUUIDPipe) domainId: string,
    @Body() dto: RequestCertificateDto,
    @Request() req: any,
  ) {
    const certificate = await this.sslService.requestCertificate(domainId, dto, req.user);
    return this.sanitizeCertificate(certificate);
  }

  @Post('domains/:domainId/ssl/upload')
  @Roles(UserRole.ROOT_ADMIN, UserRole.RESELLER, UserRole.DOMAIN_OWNER)
  async uploadCertificate(
    @Param('domainId', ParseUUIDPipe) domainId: string,
    @Body() dto: UploadCertificateDto,
    @Request() req: any,
  ) {
    const certificate = await this.sslService.uploadCertificate(domainId, dto, req.user);
    return this.sanitizeCertificate(certificate);
  }

  @Post('domains/:domainId/ssl/renew')
  @Roles(UserRole.ROOT_ADMIN, UserRole.RESELLER, UserRole.DOMAIN_OWNER)
  async renewCertificate(
    @Param('domainId', ParseUUIDPipe) domainId: string,
    @Body() dto: RenewCertificateDto,
    @Request() req: any,
  ) {
    const certificate = await this.sslService.renewCertificate(
      domainId,
      dto.force,
      req.user,
    );
    return this.sanitizeCertificate(certificate);
  }

  @Delete('domains/:domainId/ssl')
  @Roles(UserRole.ROOT_ADMIN, UserRole.RESELLER, UserRole.DOMAIN_OWNER)
  async removeCertificate(
    @Param('domainId', ParseUUIDPipe) domainId: string,
    @Request() req: any,
  ) {
    await this.sslService.removeCertificate(domainId, req.user);
    return { message: 'Certificate removed successfully' };
  }

  /**
   * Remove sensitive data from certificate response
   */
  private sanitizeCertificate(certificate: any) {
    const { encryptedPrivateKey, privateKeyIv, ...safe } = certificate;
    return {
      ...safe,
      daysUntilExpiry: certificate.getDaysUntilExpiry?.() ?? null,
      isExpiringSoon: certificate.isExpiringSoon?.() ?? false,
      isExpired: certificate.isExpired?.() ?? false,
    };
  }
}
