import { useState } from 'react';
import { Button, Input, Modal, Alert } from '@/components/ui';
import { useCreateDnsZone } from '@/hooks';
import { getErrorMessage } from '@/lib/api';

interface DnsZoneCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  domainId?: string;
}

export function DnsZoneCreateModal({ isOpen, onClose, domainId }: DnsZoneCreateModalProps) {
  const [zoneName, setZoneName] = useState('');
  const [ttl, setTtl] = useState(3600);
  const [primaryNs, setPrimaryNs] = useState('ns1.example.com');
  const [adminEmail, setAdminEmail] = useState('admin.example.com');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [soaRefresh, setSoaRefresh] = useState(86400);
  const [soaRetry, setSoaRetry] = useState(7200);
  const [soaExpire, setSoaExpire] = useState(3600000);
  const [soaMinimum, setSoaMinimum] = useState(172800);
  const [error, setError] = useState<string | null>(null);

  const createZone = useCreateDnsZone();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await createZone.mutateAsync({
        zoneName,
        ttl,
        primaryNs,
        adminEmail,
        soaRefresh,
        soaRetry,
        soaExpire,
        soaMinimum,
        domainId,
      });
      handleClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleClose = () => {
    setZoneName('');
    setTtl(3600);
    setPrimaryNs('ns1.example.com');
    setAdminEmail('admin.example.com');
    setShowAdvanced(false);
    setSoaRefresh(86400);
    setSoaRetry(7200);
    setSoaExpire(3600000);
    setSoaMinimum(172800);
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create DNS Zone">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Zone Name
          </label>
          <Input
            value={zoneName}
            onChange={(e) => setZoneName(e.target.value.toLowerCase())}
            placeholder="example.com"
            required
            pattern="^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$"
            title="Valid domain name (e.g., example.com)"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Primary Nameserver
            </label>
            <Input
              value={primaryNs}
              onChange={(e) => setPrimaryNs(e.target.value)}
              placeholder="ns1.example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Admin Email
            </label>
            <Input
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin.example.com"
              required
            />
            <p className="text-xs text-surface-500 mt-1">
              Use . instead of @ (e.g., admin.example.com)
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Default TTL (seconds)
          </label>
          <Input
            type="number"
            value={ttl}
            onChange={(e) => setTtl(parseInt(e.target.value) || 3600)}
            min={60}
          />
        </div>

        <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced SOA Settings
          </button>
        </div>

        {showAdvanced && (
          <div className="space-y-4 pl-4 border-l-2 border-surface-200 dark:border-surface-700">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Refresh (seconds)
                </label>
                <Input
                  type="number"
                  value={soaRefresh}
                  onChange={(e) => setSoaRefresh(parseInt(e.target.value) || 86400)}
                  min={60}
                />
                <p className="text-xs text-surface-500 mt-1">
                  How often secondary servers check for updates
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Retry (seconds)
                </label>
                <Input
                  type="number"
                  value={soaRetry}
                  onChange={(e) => setSoaRetry(parseInt(e.target.value) || 7200)}
                  min={60}
                />
                <p className="text-xs text-surface-500 mt-1">
                  Retry interval after failed refresh
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Expire (seconds)
                </label>
                <Input
                  type="number"
                  value={soaExpire}
                  onChange={(e) => setSoaExpire(parseInt(e.target.value) || 3600000)}
                  min={60}
                />
                <p className="text-xs text-surface-500 mt-1">
                  When secondary server data becomes invalid
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Minimum/Negative TTL (seconds)
                </label>
                <Input
                  type="number"
                  value={soaMinimum}
                  onChange={(e) => setSoaMinimum(parseInt(e.target.value) || 172800)}
                  min={60}
                />
                <p className="text-xs text-surface-500 mt-1">
                  TTL for negative responses (NXDOMAIN)
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={createZone.isPending}>
            Create Zone
          </Button>
        </div>
      </form>
    </Modal>
  );
}
