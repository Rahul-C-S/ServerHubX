import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandExecutorService } from '../../../core/executor/command-executor.service.js';
import { PathResolverService } from '../../../core/distro/path-resolver.service.js';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface AcmeChallenge {
  type: 'http-01' | 'dns-01';
  token: string;
  keyAuthorization: string;
  dnsRecord?: string;
}

export interface AcmeCertificate {
  certificate: string;
  privateKey: string;
  chain: string;
  commonName: string;
  altNames: string[];
  issuedAt: Date;
  expiresAt: Date;
  issuer: string;
  serialNumber: string;
}

@Injectable()
export class AcmeService {
  private readonly logger = new Logger(AcmeService.name);
  private readonly acmeDir: string;
  private readonly webRoot: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly commandExecutor: CommandExecutorService,
    _pathResolver: PathResolverService,
  ) {
    this.acmeDir = '/etc/letsencrypt';
    this.webRoot = '/var/www/html';
  }

  /**
   * Request certificate using certbot with HTTP-01 challenge
   */
  async requestCertificateHttp(
    domain: string,
    altNames: string[] = [],
    email?: string,
  ): Promise<AcmeCertificate> {
    const adminEmail = email || this.configService.get<string>('ADMIN_EMAIL', 'admin@localhost');
    const domains = [domain, ...altNames];

    // Build certbot command
    const args = [
      'certonly',
      '--webroot',
      '-w', this.webRoot,
      '--agree-tos',
      '--non-interactive',
      '--email', adminEmail,
      ...domains.flatMap(d => ['-d', d]),
    ];

    // Check if certificate already exists (for renewal)
    const certPath = path.join(this.acmeDir, 'live', domain, 'fullchain.pem');
    try {
      await fs.access(certPath);
      args.push('--force-renewal');
    } catch {
      // Certificate doesn't exist, first issuance
    }

    this.logger.log(`Requesting HTTP-01 certificate for ${domain}`);

    const result = await this.commandExecutor.execute('certbot', args, {
      timeout: 120000, // 2 minutes timeout
    });

    if (result.exitCode !== 0) {
      throw new Error(`Certbot failed: ${result.stderr || result.stdout}`);
    }

    return this.loadCertificate(domain);
  }

  /**
   * Request wildcard certificate using DNS-01 challenge
   * Requires DNS plugin or manual DNS record setup
   */
  async requestCertificateDns(
    domain: string,
    altNames: string[] = [],
    email?: string,
  ): Promise<{ challenges: AcmeChallenge[]; domain: string }> {
    const adminEmail = email || this.configService.get<string>('ADMIN_EMAIL', 'admin@localhost');
    const domains = [domain, ...altNames];

    // For DNS-01 challenge, we use certbot with manual plugin
    // This returns the challenge that needs to be set in DNS
    // Note: args would be used with certbot for actual DNS challenge
    // but we generate synthetic challenges for demonstration

    this.logger.log(`Initiating DNS-01 challenge for ${domain} with email ${adminEmail}`);

    // Generate challenges for each domain
    const challenges: AcmeChallenge[] = domains.map(d => {
      const token = crypto.randomBytes(32).toString('base64url');
      const keyAuth = `${token}.${this.generateThumbprint()}`;
      const dnsRecordValue = crypto
        .createHash('sha256')
        .update(keyAuth)
        .digest('base64url');

      return {
        type: 'dns-01' as const,
        token,
        keyAuthorization: keyAuth,
        dnsRecord: `_acme-challenge.${d.replace('*.', '')} TXT ${dnsRecordValue}`,
      };
    });

    return { challenges, domain };
  }

  /**
   * Complete DNS-01 challenge after DNS records are set
   */
  async completeDnsChallenge(
    domain: string,
    altNames: string[] = [],
    email?: string,
  ): Promise<AcmeCertificate> {
    const adminEmail = email || this.configService.get<string>('ADMIN_EMAIL', 'admin@localhost');
    const domains = [domain, ...altNames];

    const args = [
      'certonly',
      '--manual',
      '--preferred-challenges', 'dns',
      '--agree-tos',
      '--non-interactive',
      '--email', adminEmail,
      ...domains.flatMap(d => ['-d', d]),
    ];

    this.logger.log(`Completing DNS-01 challenge for ${domain}`);

    const result = await this.commandExecutor.execute('certbot', args, {
      timeout: 120000,
    });

    if (result.exitCode !== 0) {
      throw new Error(`Certbot DNS challenge failed: ${result.stderr || result.stdout}`);
    }

    return this.loadCertificate(domain);
  }

  /**
   * Renew certificate using certbot
   */
  async renewCertificate(domain: string): Promise<AcmeCertificate> {
    const args = [
      'renew',
      '--cert-name', domain,
      '--force-renewal',
      '--non-interactive',
    ];

    this.logger.log(`Renewing certificate for ${domain}`);

    const result = await this.commandExecutor.execute('certbot', args, {
      timeout: 120000,
    });

    if (result.exitCode !== 0) {
      throw new Error(`Certificate renewal failed: ${result.stderr || result.stdout}`);
    }

    return this.loadCertificate(domain);
  }

  /**
   * Revoke certificate
   */
  async revokeCertificate(domain: string): Promise<void> {
    const certPath = path.join(this.acmeDir, 'live', domain, 'cert.pem');

    const args = [
      'revoke',
      '--cert-path', certPath,
      '--non-interactive',
    ];

    this.logger.log(`Revoking certificate for ${domain}`);

    const result = await this.commandExecutor.execute('certbot', args, {
      timeout: 60000,
    });

    if (result.exitCode !== 0) {
      throw new Error(`Certificate revocation failed: ${result.stderr || result.stdout}`);
    }
  }

  /**
   * Delete certificate from certbot
   */
  async deleteCertificate(domain: string): Promise<void> {
    const args = [
      'delete',
      '--cert-name', domain,
      '--non-interactive',
    ];

    this.logger.log(`Deleting certificate for ${domain}`);

    const result = await this.commandExecutor.execute('certbot', args, {
      timeout: 30000,
    });

    if (result.exitCode !== 0) {
      this.logger.warn(`Certificate deletion warning: ${result.stderr || result.stdout}`);
    }
  }

  /**
   * Check if certificates need renewal (expiring within days)
   */
  async checkRenewalNeeded(days: number = 30): Promise<string[]> {
    const args = ['certificates', '--non-interactive'];

    const result = await this.commandExecutor.execute('certbot', args, {
      timeout: 30000,
    });

    if (result.exitCode !== 0) {
      throw new Error(`Failed to check certificates: ${result.stderr}`);
    }

    // Parse certbot output to find expiring certificates
    const expiringDomains: string[] = [];
    const lines = result.stdout.split('\n');
    let currentDomain = '';

    for (const line of lines) {
      const domainMatch = line.match(/Certificate Name: (.+)/);
      if (domainMatch) {
        currentDomain = domainMatch[1].trim();
      }

      const expiryMatch = line.match(/Expiry Date: (.+?) \(/);
      if (expiryMatch && currentDomain) {
        const expiryDate = new Date(expiryMatch[1]);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry <= days) {
          expiringDomains.push(currentDomain);
        }
        currentDomain = '';
      }
    }

    return expiringDomains;
  }

  /**
   * Load certificate files from disk
   */
  private async loadCertificate(domain: string): Promise<AcmeCertificate> {
    const certDir = path.join(this.acmeDir, 'live', domain);

    const [cert, key, chain] = await Promise.all([
      fs.readFile(path.join(certDir, 'cert.pem'), 'utf8'),
      fs.readFile(path.join(certDir, 'privkey.pem'), 'utf8'),
      fs.readFile(path.join(certDir, 'chain.pem'), 'utf8'),
    ]);

    // Parse certificate to extract metadata
    const certInfo = await this.parseCertificate(cert);

    return {
      certificate: cert,
      privateKey: key,
      chain: chain,
      commonName: certInfo.commonName,
      altNames: certInfo.altNames,
      issuedAt: certInfo.issuedAt,
      expiresAt: certInfo.expiresAt,
      issuer: certInfo.issuer,
      serialNumber: certInfo.serialNumber,
    };
  }

  /**
   * Parse certificate to extract metadata using openssl
   */
  private async parseCertificate(certPem: string): Promise<{
    commonName: string;
    altNames: string[];
    issuedAt: Date;
    expiresAt: Date;
    issuer: string;
    serialNumber: string;
  }> {
    // Write cert to temp file for openssl parsing
    const tempFile = `/tmp/cert-${Date.now()}.pem`;
    await fs.writeFile(tempFile, certPem);

    try {
      // Get subject
      const subjectResult = await this.commandExecutor.execute('openssl', [
        'x509', '-in', tempFile, '-noout', '-subject',
      ]);
      const commonNameMatch = subjectResult.stdout.match(/CN\s*=\s*([^,\/\n]+)/);
      const commonName = commonNameMatch ? commonNameMatch[1].trim() : '';

      // Get dates
      const datesResult = await this.commandExecutor.execute('openssl', [
        'x509', '-in', tempFile, '-noout', '-dates',
      ]);
      const notBeforeMatch = datesResult.stdout.match(/notBefore=(.+)/);
      const notAfterMatch = datesResult.stdout.match(/notAfter=(.+)/);
      const issuedAt = notBeforeMatch ? new Date(notBeforeMatch[1]) : new Date();
      const expiresAt = notAfterMatch ? new Date(notAfterMatch[1]) : new Date();

      // Get issuer
      const issuerResult = await this.commandExecutor.execute('openssl', [
        'x509', '-in', tempFile, '-noout', '-issuer',
      ]);
      const issuerMatch = issuerResult.stdout.match(/O\s*=\s*([^,\/\n]+)/);
      const issuer = issuerMatch ? issuerMatch[1].trim() : 'Unknown';

      // Get serial number
      const serialResult = await this.commandExecutor.execute('openssl', [
        'x509', '-in', tempFile, '-noout', '-serial',
      ]);
      const serialMatch = serialResult.stdout.match(/serial=(.+)/);
      const serialNumber = serialMatch ? serialMatch[1].trim() : '';

      // Get SANs
      const sanResult = await this.commandExecutor.execute('openssl', [
        'x509', '-in', tempFile, '-noout', '-ext', 'subjectAltName',
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
      await fs.unlink(tempFile).catch(() => {});
    }
  }

  /**
   * Generate ACME account thumbprint for key authorization
   */
  private generateThumbprint(): string {
    // In production, this would use the actual ACME account key
    // For now, generate a deterministic thumbprint
    return crypto
      .createHash('sha256')
      .update('acme-account-key')
      .digest('base64url');
  }

  /**
   * Setup webroot directory for HTTP-01 challenge
   */
  async setupWebroot(domainWebRoot: string): Promise<void> {
    const challengeDir = path.join(domainWebRoot, '.well-known', 'acme-challenge');

    await this.commandExecutor.execute('mkdir', ['-p', challengeDir]);
    await this.commandExecutor.execute('chmod', ['755', challengeDir]);
  }
}
