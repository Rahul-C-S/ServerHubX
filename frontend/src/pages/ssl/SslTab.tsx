import { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  RefreshCw,
  Upload,
  Trash2,
  Clock,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  Modal,
  Alert,
  Spinner,
  Badge,
} from '@/components/ui';
import {
  useCertificate,
  useRequestCertificate,
  useRenewCertificate,
  useRemoveCertificate,
} from '@/hooks';
import type { Domain } from '@/types';
import type { CertificateStatus, CertificateType, ChallengeType } from '@/types';
import { SslUploadModal } from './SslUploadModal';

interface SslTabProps {
  domain: Domain;
}

export function SslTab({ domain }: SslTabProps) {
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);

  const { data: certificate, isLoading, error } = useCertificate(domain.id);
  const requestCertificate = useRequestCertificate();
  const renewCertificate = useRenewCertificate();
  const removeCertificate = useRemoveCertificate();

  const handleRequestCertificate = async () => {
    try {
      await requestCertificate.mutateAsync({
        domainId: domain.id,
        data: {
          type: 'LETS_ENCRYPT' as CertificateType,
          challengeType: 'HTTP_01' as ChallengeType,
          autoRenew: true,
        },
      });
      setIsRequestModalOpen(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleRenewCertificate = async () => {
    try {
      await renewCertificate.mutateAsync({
        domainId: domain.id,
        data: { force: true },
      });
    } catch {
      // Error handled by mutation
    }
  };

  const handleRemoveCertificate = async () => {
    try {
      await removeCertificate.mutateAsync(domain.id);
      setIsRemoveModalOpen(false);
    } catch {
      // Error handled by mutation
    }
  };

  const getStatusBadge = (status: CertificateStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>;
      case 'PENDING':
        return <Badge variant="warning">Pending</Badge>;
      case 'EXPIRED':
        return <Badge variant="danger">Expired</Badge>;
      case 'REVOKED':
        return <Badge variant="danger">Revoked</Badge>;
      case 'FAILED':
        return <Badge variant="danger">Failed</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const getStatusIcon = (status: CertificateStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <ShieldCheck className="w-12 h-12 text-green-500" />;
      case 'PENDING':
        return <Shield className="w-12 h-12 text-yellow-500" />;
      case 'EXPIRED':
        return <ShieldAlert className="w-12 h-12 text-red-500" />;
      default:
        return <ShieldX className="w-12 h-12 text-red-500" />;
    }
  };

  const getDaysUntilExpiry = () => {
    if (!certificate?.validUntil) return null;
    const expiryDate = new Date(certificate.validUntil);
    const now = new Date();
    const diff = expiryDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error">Failed to load SSL certificate information.</Alert>
    );
  }

  // No certificate installed
  if (!certificate) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Shield className="w-16 h-16 mx-auto text-surface-300 dark:text-surface-600" />
              <h3 className="mt-4 text-lg font-medium text-surface-900 dark:text-surface-100">
                No SSL Certificate
              </h3>
              <p className="mt-2 text-surface-500 dark:text-surface-400 max-w-md mx-auto">
                Secure your domain with an SSL certificate. You can request a free
                Let's Encrypt certificate or upload your own.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <Button onClick={() => setIsRequestModalOpen(true)}>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Get Free SSL (Let's Encrypt)
                </Button>
                <Button variant="secondary" onClick={() => setIsUploadModalOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Certificate
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Request Certificate Modal */}
        <Modal
          isOpen={isRequestModalOpen}
          onClose={() => setIsRequestModalOpen(false)}
          title="Request SSL Certificate"
        >
          <div className="space-y-4">
            <p className="text-surface-600 dark:text-surface-400">
              This will request a free SSL certificate from Let's Encrypt for{' '}
              <span className="font-medium text-surface-900 dark:text-surface-100">
                {domain.name}
              </span>
              .
            </p>
            <Alert variant="info">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Requirements:</p>
                  <ul className="list-disc list-inside mt-1 text-sm">
                    <li>Domain must point to this server</li>
                    <li>Port 80 must be accessible</li>
                    <li>Certificate will auto-renew every 60 days</li>
                  </ul>
                </div>
              </div>
            </Alert>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsRequestModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleRequestCertificate}
                isLoading={requestCertificate.isPending}
              >
                Request Certificate
              </Button>
            </div>
          </div>
        </Modal>

        {/* Upload Certificate Modal */}
        <SslUploadModal
          domainId={domain.id}
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
        />
      </div>
    );
  }

  // Certificate exists
  const daysUntilExpiry = getDaysUntilExpiry();
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30;

  return (
    <div className="space-y-6">
      {/* Certificate Status Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              {getStatusIcon(certificate.status)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-medium text-surface-900 dark:text-surface-100">
                  SSL Certificate
                </h3>
                {getStatusBadge(certificate.status)}
                {certificate.type === 'LETS_ENCRYPT' && (
                  <Badge variant="info">Let's Encrypt</Badge>
                )}
              </div>
              <p className="mt-1 text-surface-500 dark:text-surface-400">
                {certificate.commonName}
              </p>
              {certificate.altNames && certificate.altNames.length > 0 && (
                <p className="mt-1 text-sm text-surface-400">
                  Alt names: {certificate.altNames.join(', ')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {certificate.type === 'LETS_ENCRYPT' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRenewCertificate}
                  isLoading={renewCertificate.isPending}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Renew
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsRemoveModalOpen(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certificate Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-surface-400" />
              <div>
                <p className="text-sm text-surface-500">Valid From</p>
                <p className="font-medium text-surface-900 dark:text-surface-100">
                  {certificate.validFrom
                    ? new Date(certificate.validFrom).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {isExpiringSoon ? (
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              ) : (
                <Clock className="w-5 h-5 text-surface-400" />
              )}
              <div>
                <p className="text-sm text-surface-500">Valid Until</p>
                <p
                  className={`font-medium ${
                    isExpiringSoon
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-surface-900 dark:text-surface-100'
                  }`}
                >
                  {certificate.validUntil
                    ? new Date(certificate.validUntil).toLocaleDateString()
                    : 'N/A'}
                  {daysUntilExpiry !== null && (
                    <span className="text-sm ml-2">({daysUntilExpiry} days)</span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-surface-400" />
              <div>
                <p className="text-sm text-surface-500">Issuer</p>
                <p className="font-medium text-surface-900 dark:text-surface-100">
                  {certificate.issuer || 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-surface-400" />
              <div>
                <p className="text-sm text-surface-500">Auto Renew</p>
                <p className="font-medium text-surface-900 dark:text-surface-100">
                  {certificate.autoRenew ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expiring Soon Warning */}
      {isExpiringSoon && certificate.status === 'ACTIVE' && (
        <Alert variant="warning">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <p className="font-medium">Certificate expiring soon</p>
              <p className="text-sm">
                Your certificate will expire in {daysUntilExpiry} days.
                {certificate.autoRenew
                  ? ' Auto-renewal is enabled.'
                  : ' Consider enabling auto-renewal or manually renewing.'}
              </p>
            </div>
          </div>
        </Alert>
      )}

      {/* Renewal Error */}
      {certificate.renewalError && (
        <Alert variant="error">
          <div>
            <p className="font-medium">Last renewal failed</p>
            <p className="text-sm">{certificate.renewalError}</p>
          </div>
        </Alert>
      )}

      {/* Remove Certificate Modal */}
      <Modal
        isOpen={isRemoveModalOpen}
        onClose={() => setIsRemoveModalOpen(false)}
        title="Remove Certificate"
      >
        <div className="space-y-4">
          <p className="text-surface-600 dark:text-surface-400">
            Are you sure you want to remove the SSL certificate for{' '}
            <span className="font-medium text-surface-900 dark:text-surface-100">
              {domain.name}
            </span>
            ?
          </p>
          <Alert variant="warning">
            Your site will become insecure after removing the certificate.
          </Alert>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsRemoveModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleRemoveCertificate}
              isLoading={removeCertificate.isPending}
            >
              Remove Certificate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
