import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Certificate, CertificateType, CertificateStatus } from './entities/certificate.entity.js';
import { AcmeService, AcmeCertificate } from './services/acme.service.js';
import { CommandExecutorService } from '../../core/executor/command-executor.service.js';
import { PathResolverService } from '../../core/distro/path-resolver.service.js';
import { AuditLoggerService } from '../../core/audit/audit-logger.service.js';
import { AuditOperationType, AuditResourceType } from '../../core/audit/entities/audit-log.entity.js';
import { Domain } from '../domains/entities/domain.entity.js';
import { RequestCertificateDto, UploadCertificateDto, ChallengeType } from './dto/request-certificate.dto.js';
import { User } from '../users/entities/user.entity.js';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class SslService {
  private readonly logger = new Logger(SslService.name);

  constructor(
    @InjectRepository(Certificate)
    private readonly certificateRepository: Repository<Certificate>,
    @InjectRepository(Domain)
    private readonly domainRepository: Repository<Domain>,
    private readonly acmeService: AcmeService,
    private readonly commandExecutor: CommandExecutorService,
    private readonly pathResolver: PathResolverService,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  async findByDomain(domainId: string): Promise<Certificate | null> {
    return this.certificateRepository.findOne({
      where: { domainId },
      relations: ['domain'],
    });
  }

  async findAll(): Promise<Certificate[]> {
    return this.certificateRepository.find({
      relations: ['domain'],
      order: { createdAt: 'DESC' },
    });
  }

  async findExpiring(days: number = 30): Promise<Certificate[]> {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + days);

    return this.certificateRepository
      .createQueryBuilder('cert')
      .leftJoinAndSelect('cert.domain', 'domain')
      .where('cert.expiresAt <= :threshold', { threshold })
      .andWhere('cert.status = :status', { status: CertificateStatus.ACTIVE })
      .andWhere('cert.autoRenew = :autoRenew', { autoRenew: true })
      .getMany();
  }

  async requestCertificate(
    domainId: string,
    dto: RequestCertificateDto,
    performedBy: User,
  ): Promise<Certificate> {
    const domain = await this.domainRepository.findOne({ where: { id: domainId } });
    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    // Check for existing certificate
    let certificate = await this.findByDomain(domainId);

    if (!certificate) {
      certificate = this.certificateRepository.create({
        commonName: domain.name,
        altNames: dto.altNames || [],
        type: CertificateType.LETS_ENCRYPT,
        status: CertificateStatus.PENDING,
        autoRenew: dto.autoRenew ?? true,
        domainId,
      });
      certificate = await this.certificateRepository.save(certificate);
    }

    try {
      let acmeCert: AcmeCertificate;

      if (dto.challengeType === ChallengeType.DNS_01) {
        // For DNS-01, we need a two-step process
        // First initiate the challenge, then complete after DNS is set
        throw new BadRequestException(
          'DNS-01 challenge requires DNS record setup. Use /ssl/dns-challenge endpoint.'
        );
      } else {
        // HTTP-01 challenge
        await this.acmeService.setupWebroot(this.getWebRoot(domain.name));
        acmeCert = await this.acmeService.requestCertificateHttp(
          domain.name,
          dto.altNames || [],
        );
      }

      // Update certificate with obtained data
      certificate.certificate = acmeCert.certificate;
      certificate.encryptPrivateKey(acmeCert.privateKey);
      certificate.chain = acmeCert.chain;
      certificate.issuedAt = acmeCert.issuedAt;
      certificate.expiresAt = acmeCert.expiresAt;
      certificate.issuer = acmeCert.issuer;
      certificate.serialNumber = acmeCert.serialNumber;
      certificate.fingerprint = this.generateFingerprint(acmeCert.certificate);
      certificate.status = CertificateStatus.ACTIVE;
      certificate.lastError = null;

      certificate = await this.certificateRepository.save(certificate);

      // Install certificate in Apache
      await this.installCertificate(certificate, domain);

      await this.auditLogger.log({
        operationType: AuditOperationType.CREATE,
        resourceType: AuditResourceType.SSL_CERTIFICATE,
        resourceId: certificate.id,
        resourceName: certificate.commonName,
        description: `Obtained Let's Encrypt certificate for ${domain.name}`,
      }, { userId: performedBy.id });

      this.logger.log(`Certificate obtained for ${domain.name}`);
      return certificate;
    } catch (error) {
      certificate.status = CertificateStatus.FAILED;
      certificate.lastError = (error as Error).message;
      certificate.lastRenewalAttempt = new Date();
      await this.certificateRepository.save(certificate);

      this.logger.error(`Failed to obtain certificate for ${domain.name}: ${(error as Error).message}`);
      throw error;
    }
  }

  async uploadCertificate(
    domainId: string,
    dto: UploadCertificateDto,
    performedBy: User,
  ): Promise<Certificate> {
    const domain = await this.domainRepository.findOne({ where: { id: domainId } });
    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    // Validate certificate
    const certInfo = await this.validateCertificate(dto.certificate, dto.privateKey);

    // Check for existing certificate
    let certificate = await this.findByDomain(domainId);

    if (certificate) {
      // Update existing
      certificate.certificate = dto.certificate;
      certificate.encryptPrivateKey(dto.privateKey);
      certificate.chain = dto.chain || null;
      certificate.type = CertificateType.CUSTOM;
    } else {
      // Create new
      certificate = this.certificateRepository.create({
        commonName: certInfo.commonName,
        altNames: certInfo.altNames,
        type: CertificateType.CUSTOM,
        status: CertificateStatus.ACTIVE,
        autoRenew: dto.autoRenew ?? false,
        domainId,
      });
      certificate.certificate = dto.certificate;
      certificate.encryptPrivateKey(dto.privateKey);
      certificate.chain = dto.chain || null;
    }

    certificate.issuedAt = certInfo.issuedAt;
    certificate.expiresAt = certInfo.expiresAt;
    certificate.issuer = certInfo.issuer;
    certificate.serialNumber = certInfo.serialNumber;
    certificate.fingerprint = this.generateFingerprint(dto.certificate);
    certificate.status = CertificateStatus.ACTIVE;
    certificate.lastError = null;

    certificate = await this.certificateRepository.save(certificate);

    // Install certificate in Apache
    await this.installCertificate(certificate, domain);

    await this.auditLogger.log({
      operationType: AuditOperationType.CREATE,
      resourceType: AuditResourceType.SSL_CERTIFICATE,
      resourceId: certificate.id,
      resourceName: certificate.commonName,
      description: `Uploaded custom certificate for ${domain.name}`,
    }, { userId: performedBy.id });

    this.logger.log(`Custom certificate uploaded for ${domain.name}`);
    return certificate;
  }

  async renewCertificate(
    domainId: string,
    force: boolean = false,
    performedBy?: User,
  ): Promise<Certificate> {
    const certificate = await this.findByDomain(domainId);
    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    if (certificate.type !== CertificateType.LETS_ENCRYPT) {
      throw new BadRequestException('Only Let\'s Encrypt certificates can be auto-renewed');
    }

    if (!force && !certificate.isExpiringSoon()) {
      throw new BadRequestException('Certificate is not due for renewal');
    }

    const domain = await this.domainRepository.findOne({ where: { id: domainId } });
    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    try {
      const acmeCert = await this.acmeService.renewCertificate(domain.name);

      certificate.certificate = acmeCert.certificate;
      certificate.encryptPrivateKey(acmeCert.privateKey);
      certificate.chain = acmeCert.chain;
      certificate.issuedAt = acmeCert.issuedAt;
      certificate.expiresAt = acmeCert.expiresAt;
      certificate.issuer = acmeCert.issuer;
      certificate.serialNumber = acmeCert.serialNumber;
      certificate.fingerprint = this.generateFingerprint(acmeCert.certificate);
      certificate.status = CertificateStatus.ACTIVE;
      certificate.lastError = null;
      certificate.lastRenewalAttempt = new Date();

      await this.certificateRepository.save(certificate);

      // Re-install certificate in Apache
      await this.installCertificate(certificate, domain);

      if (performedBy) {
        await this.auditLogger.log({
          operationType: AuditOperationType.UPDATE,
          resourceType: AuditResourceType.SSL_CERTIFICATE,
          resourceId: certificate.id,
          resourceName: certificate.commonName,
          description: `Renewed certificate for ${domain.name}`,
        }, { userId: performedBy.id });
      }

      this.logger.log(`Certificate renewed for ${domain.name}`);
      return certificate;
    } catch (error) {
      certificate.status = CertificateStatus.FAILED;
      certificate.lastError = (error as Error).message;
      certificate.lastRenewalAttempt = new Date();
      await this.certificateRepository.save(certificate);

      this.logger.error(`Failed to renew certificate for ${domain.name}: ${(error as Error).message}`);
      throw error;
    }
  }

  async removeCertificate(domainId: string, performedBy: User): Promise<void> {
    const certificate = await this.findByDomain(domainId);
    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    const domain = await this.domainRepository.findOne({ where: { id: domainId } });
    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    // Remove SSL from Apache config
    await this.uninstallCertificate(domain);

    // Revoke Let's Encrypt certificate if applicable
    if (certificate.type === CertificateType.LETS_ENCRYPT) {
      try {
        await this.acmeService.revokeCertificate(domain.name);
        await this.acmeService.deleteCertificate(domain.name);
      } catch (error) {
        this.logger.warn(`Failed to revoke certificate: ${(error as Error).message}`);
      }
    }

    await this.certificateRepository.remove(certificate);

    await this.auditLogger.log({
      operationType: AuditOperationType.DELETE,
      resourceType: AuditResourceType.SSL_CERTIFICATE,
      resourceId: certificate.id,
      resourceName: certificate.commonName,
      description: `Removed certificate for ${domain.name}`,
    }, { userId: performedBy.id });

    this.logger.log(`Certificate removed for ${domain.name}`);
  }

  /**
   * Install certificate in Apache
   */
  private async installCertificate(certificate: Certificate, domain: Domain): Promise<void> {
    const sslDir = this.pathResolver.getSslCertDir(domain.name);

    // Create SSL directory
    await this.commandExecutor.execute('mkdir', ['-p', sslDir]);

    // Write certificate files
    const certPath = path.join(sslDir, 'cert.pem');
    const keyPath = path.join(sslDir, 'privkey.pem');
    const chainPath = path.join(sslDir, 'chain.pem');
    const fullchainPath = path.join(sslDir, 'fullchain.pem');

    if (!certificate.certificate) {
      throw new BadRequestException('Certificate data is missing');
    }
    const privateKey = certificate.decryptPrivateKey();
    if (!privateKey) {
      throw new BadRequestException('Failed to decrypt private key');
    }

    await fs.writeFile(certPath, certificate.certificate);
    await fs.writeFile(keyPath, privateKey);

    if (certificate.chain) {
      await fs.writeFile(chainPath, certificate.chain);
      await fs.writeFile(fullchainPath, certificate.certificate + '\n' + certificate.chain);
    } else {
      await fs.writeFile(fullchainPath, certificate.certificate);
    }

    // Set proper permissions
    await this.commandExecutor.execute('chmod', ['600', keyPath]);
    await this.commandExecutor.execute('chmod', ['644', certPath, chainPath, fullchainPath]);

    // Generate Apache SSL VHost config
    await this.generateApacheSslConfig(domain, {
      certPath: fullchainPath,
      keyPath,
      chainPath: certificate.chain ? chainPath : undefined,
    });

    // Reload Apache
    await this.commandExecutor.execute('systemctl', ['reload', 'apache2']);
  }

  /**
   * Uninstall certificate from Apache
   */
  private async uninstallCertificate(domain: Domain): Promise<void> {
    const sslConfigPath = this.pathResolver.getApacheSslSitePath(domain.name);

    // Disable SSL site
    try {
      await this.commandExecutor.execute('a2dissite', [`${domain.name}-ssl.conf`]);
    } catch {
      // Site might not be enabled
    }

    // Remove SSL config
    try {
      await fs.unlink(sslConfigPath);
    } catch {
      // Config might not exist
    }

    // Reload Apache
    await this.commandExecutor.execute('systemctl', ['reload', 'apache2']);
  }

  /**
   * Generate Apache SSL VHost configuration
   */
  private async generateApacheSslConfig(
    domain: Domain,
    paths: { certPath: string; keyPath: string; chainPath?: string },
  ): Promise<void> {
    const config = `<VirtualHost *:443>
    ServerName ${domain.name}
    ServerAlias www.${domain.name}
    DocumentRoot /home/${domain.systemUser?.username || domain.name}/public_html

    SSLEngine on
    SSLCertificateFile ${paths.certPath}
    SSLCertificateKeyFile ${paths.keyPath}
    ${paths.chainPath ? `SSLCertificateChainFile ${paths.chainPath}` : ''}

    # Modern SSL Configuration
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384
    SSLHonorCipherOrder off
    SSLSessionTickets off

    # HSTS (optional, uncomment to enable)
    # Header always set Strict-Transport-Security "max-age=63072000"

    <Directory /home/${domain.systemUser?.username || domain.name}/public_html>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog \${APACHE_LOG_DIR}/${domain.name}-ssl-error.log
    CustomLog \${APACHE_LOG_DIR}/${domain.name}-ssl-access.log combined
</VirtualHost>

# HTTP to HTTPS redirect
<VirtualHost *:80>
    ServerName ${domain.name}
    ServerAlias www.${domain.name}
    Redirect permanent / https://${domain.name}/
</VirtualHost>
`;

    const sslConfigPath = this.pathResolver.getApacheSslSitePath(domain.name);
    await fs.writeFile(sslConfigPath, config);

    // Enable the SSL site
    await this.commandExecutor.execute('a2ensite', [`${domain.name}-ssl.conf`]);
  }

  /**
   * Validate uploaded certificate matches private key
   */
  private async validateCertificate(
    cert: string,
    key: string,
  ): Promise<{
    commonName: string;
    altNames: string[];
    issuedAt: Date;
    expiresAt: Date;
    issuer: string;
    serialNumber: string;
  }> {
    // Write to temp files
    const certFile = `/tmp/cert-validate-${Date.now()}.pem`;
    const keyFile = `/tmp/key-validate-${Date.now()}.pem`;

    await fs.writeFile(certFile, cert);
    await fs.writeFile(keyFile, key);

    try {
      // Get certificate modulus
      const certModResult = await this.commandExecutor.execute('openssl', [
        'x509', '-noout', '-modulus', '-in', certFile,
      ]);

      // Get key modulus
      const keyModResult = await this.commandExecutor.execute('openssl', [
        'rsa', '-noout', '-modulus', '-in', keyFile,
      ]);

      if (certModResult.stdout.trim() !== keyModResult.stdout.trim()) {
        throw new BadRequestException('Certificate and private key do not match');
      }

      // Parse certificate info
      const subjectResult = await this.commandExecutor.execute('openssl', [
        'x509', '-in', certFile, '-noout', '-subject',
      ]);
      const commonNameMatch = subjectResult.stdout.match(/CN\s*=\s*([^,\/\n]+)/);
      const commonName = commonNameMatch ? commonNameMatch[1].trim() : '';

      const datesResult = await this.commandExecutor.execute('openssl', [
        'x509', '-in', certFile, '-noout', '-dates',
      ]);
      const notBeforeMatch = datesResult.stdout.match(/notBefore=(.+)/);
      const notAfterMatch = datesResult.stdout.match(/notAfter=(.+)/);
      const issuedAt = notBeforeMatch ? new Date(notBeforeMatch[1]) : new Date();
      const expiresAt = notAfterMatch ? new Date(notAfterMatch[1]) : new Date();

      const issuerResult = await this.commandExecutor.execute('openssl', [
        'x509', '-in', certFile, '-noout', '-issuer',
      ]);
      const issuerMatch = issuerResult.stdout.match(/O\s*=\s*([^,\/\n]+)/);
      const issuer = issuerMatch ? issuerMatch[1].trim() : 'Unknown';

      const serialResult = await this.commandExecutor.execute('openssl', [
        'x509', '-in', certFile, '-noout', '-serial',
      ]);
      const serialMatch = serialResult.stdout.match(/serial=(.+)/);
      const serialNumber = serialMatch ? serialMatch[1].trim() : '';

      const sanResult = await this.commandExecutor.execute('openssl', [
        'x509', '-in', certFile, '-noout', '-ext', 'subjectAltName',
      ]);
      const altNames: string[] = [];
      const sanMatches = sanResult.stdout.matchAll(/DNS:([^,\s]+)/g);
      for (const match of sanMatches) {
        if (match[1] !== commonName) {
          altNames.push(match[1]);
        }
      }

      return { commonName, altNames, issuedAt, expiresAt, issuer, serialNumber };
    } finally {
      await fs.unlink(certFile).catch(() => {});
      await fs.unlink(keyFile).catch(() => {});
    }
  }

  /**
   * Generate SHA-256 fingerprint of certificate
   */
  private generateFingerprint(cert: string): string {
    const cleanCert = cert
      .replace(/-----BEGIN CERTIFICATE-----/g, '')
      .replace(/-----END CERTIFICATE-----/g, '')
      .replace(/\s/g, '');

    const der = Buffer.from(cleanCert, 'base64');
    return crypto.createHash('sha256').update(der).digest('hex');
  }

  /**
   * Get webroot for domain
   */
  private getWebRoot(domainName: string): string {
    return `/home/${domainName}/public_html`;
  }
}
