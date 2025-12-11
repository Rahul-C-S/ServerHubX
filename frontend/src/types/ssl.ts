export type CertificateType = 'LETS_ENCRYPT' | 'CUSTOM' | 'SELF_SIGNED';
export type CertificateStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'FAILED';
export type ChallengeType = 'HTTP_01' | 'DNS_01';

export interface Certificate {
  id: string;
  domain: {
    id: string;
    name: string;
  };
  type: CertificateType;
  status: CertificateStatus;
  commonName: string;
  altNames: string[];
  issuer?: string;
  validFrom?: string;
  validUntil?: string;
  autoRenew: boolean;
  lastRenewalAttempt?: string;
  renewalError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RequestCertificateDto {
  type?: CertificateType;
  challengeType?: ChallengeType;
  altNames?: string[];
  autoRenew?: boolean;
  email?: string;
}

export interface UploadCertificateDto {
  certificate: string;
  privateKey: string;
  chain?: string;
  autoRenew?: boolean;
}

export interface RenewCertificateDto {
  force?: boolean;
}

export interface CertificateInfo {
  daysUntilExpiry: number | null;
  isExpiringSoon: boolean;
  issuer: string | null;
  validFrom: string | null;
  validUntil: string | null;
}
