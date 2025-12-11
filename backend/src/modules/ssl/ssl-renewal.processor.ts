import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SslService } from './ssl.service.js';
import { CertificateStatus } from './entities/certificate.entity.js';

@Injectable()
export class SslRenewalProcessor implements OnModuleInit {
  private readonly logger = new Logger(SslRenewalProcessor.name);
  private isProcessing = false;

  constructor(private readonly sslService: SslService) {}

  onModuleInit() {
    this.logger.log('SSL Renewal Processor initialized');
  }

  /**
   * Check for certificates needing renewal daily at 2 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async processRenewals() {
    if (this.isProcessing) {
      this.logger.warn('Renewal process already running, skipping');
      return;
    }

    this.isProcessing = true;
    this.logger.log('Starting SSL certificate renewal check');

    try {
      // Find certificates expiring within 30 days
      const expiringCerts = await this.sslService.findExpiring(30);

      this.logger.log(`Found ${expiringCerts.length} certificates needing renewal`);

      for (const cert of expiringCerts) {
        try {
          this.logger.log(`Renewing certificate for ${cert.commonName}`);
          await this.sslService.renewCertificate(cert.domainId, false);
          this.logger.log(`Successfully renewed certificate for ${cert.commonName}`);
        } catch (error) {
          this.logger.error(
            `Failed to renew certificate for ${cert.commonName}: ${(error as Error).message}`,
          );
          // Continue with next certificate
        }

        // Add delay between renewals to avoid rate limiting
        await this.delay(5000);
      }

      this.logger.log('SSL certificate renewal check completed');
    } catch (error) {
      this.logger.error(`Renewal process failed: ${(error as Error).message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Weekly check for certificates that failed renewal
   */
  @Cron(CronExpression.EVERY_WEEK)
  async retryFailedRenewals() {
    this.logger.log('Checking for failed certificate renewals');

    try {
      const allCerts = await this.sslService.findAll();
      const failedCerts = allCerts.filter(
        (cert) =>
          cert.status === CertificateStatus.FAILED &&
          cert.autoRenew &&
          cert.isExpiringSoon(14), // Within 14 days of expiry
      );

      for (const cert of failedCerts) {
        try {
          this.logger.log(`Retrying renewal for ${cert.commonName}`);
          await this.sslService.renewCertificate(cert.domainId, true);
        } catch (error) {
          this.logger.error(`Retry failed for ${cert.commonName}: ${(error as Error).message}`);
        }

        await this.delay(5000);
      }
    } catch (error) {
      this.logger.error(`Failed renewal retry process failed: ${(error as Error).message}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
