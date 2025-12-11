import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Button, Modal, Alert } from '@/components/ui';
import { useUploadCertificate } from '@/hooks';

interface SslUploadModalProps {
  domainId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SslUploadModal({ domainId, isOpen, onClose }: SslUploadModalProps) {
  const [certificate, setCertificate] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [chain, setChain] = useState('');
  const [autoRenew, setAutoRenew] = useState(false);

  const uploadCertificate = useUploadCertificate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await uploadCertificate.mutateAsync({
        domainId,
        data: {
          certificate: certificate.trim(),
          privateKey: privateKey.trim(),
          chain: chain.trim() || undefined,
          autoRenew,
        },
      });
      handleClose();
    } catch {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    setCertificate('');
    setPrivateKey('');
    setChain('');
    setAutoRenew(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Upload SSL Certificate">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Alert variant="info">
          <p className="text-sm">
            Paste your certificate and private key in PEM format. The certificate
            chain is optional but recommended for browser compatibility.
          </p>
        </Alert>

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Certificate (PEM format) *
          </label>
          <textarea
            value={certificate}
            onChange={(e) => setCertificate(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100"
            placeholder="-----BEGIN CERTIFICATE-----
...
-----END CERTIFICATE-----"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Private Key (PEM format) *
          </label>
          <textarea
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100"
            placeholder="-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Certificate Chain (optional)
          </label>
          <textarea
            value={chain}
            onChange={(e) => setChain(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100"
            placeholder="-----BEGIN CERTIFICATE-----
...
-----END CERTIFICATE-----"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="autoRenew"
            checked={autoRenew}
            onChange={(e) => setAutoRenew(e.target.checked)}
            className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
          />
          <label
            htmlFor="autoRenew"
            className="text-sm text-surface-700 dark:text-surface-300"
          >
            Enable auto-renewal reminders
          </label>
        </div>

        {uploadCertificate.error && (
          <Alert variant="error">
            Failed to upload certificate. Please check the format and try again.
          </Alert>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={uploadCertificate.isPending}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Certificate
          </Button>
        </div>
      </form>
    </Modal>
  );
}
