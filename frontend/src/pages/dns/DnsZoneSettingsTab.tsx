import { useState } from 'react';
import { Button, Input, Card, CardContent, Alert } from '@/components/ui';
import { useUpdateDnsZone } from '@/hooks';
import { getErrorMessage } from '@/lib/api';
import type { DnsZone } from '@/types';

interface DnsZoneSettingsTabProps {
  zone: DnsZone;
}

export function DnsZoneSettingsTab({ zone }: DnsZoneSettingsTabProps) {
  const [ttl, setTtl] = useState(zone.ttl);
  const [primaryNs, setPrimaryNs] = useState(zone.primaryNs);
  const [adminEmail, setAdminEmail] = useState(zone.adminEmail);
  const [soaRefresh, setSoaRefresh] = useState(zone.soaRefresh);
  const [soaRetry, setSoaRetry] = useState(zone.soaRetry);
  const [soaExpire, setSoaExpire] = useState(zone.soaExpire);
  const [soaMinimum, setSoaMinimum] = useState(zone.soaMinimum);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const updateZone = useUpdateDnsZone();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await updateZone.mutateAsync({
        id: zone.id,
        data: {
          ttl,
          primaryNs,
          adminEmail,
          soaRefresh,
          soaRetry,
          soaExpire,
          soaMinimum,
        },
      });
      setSuccess('Zone settings updated successfully');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-medium text-surface-900 dark:text-surface-100 mb-4">
            General Settings
          </h3>

          <div className="grid grid-cols-2 gap-6">
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
                Use . instead of @ (e.g., admin.example.com for admin@example.com)
              </p>
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

            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Serial Number
              </label>
              <Input
                value={zone.serial}
                disabled
                className="bg-surface-100 dark:bg-surface-800"
              />
              <p className="text-xs text-surface-500 mt-1">
                Automatically incremented on changes
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-medium text-surface-900 dark:text-surface-100 mb-4">
            SOA Record Settings
          </h3>
          <p className="text-sm text-surface-500 mb-4">
            These settings control how secondary nameservers synchronize with this zone.
          </p>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Refresh Interval (seconds)
              </label>
              <Input
                type="number"
                value={soaRefresh}
                onChange={(e) => setSoaRefresh(parseInt(e.target.value) || 86400)}
                min={60}
              />
              <p className="text-xs text-surface-500 mt-1">
                How often secondary servers check for updates (default: 86400 = 24 hours)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Retry Interval (seconds)
              </label>
              <Input
                type="number"
                value={soaRetry}
                onChange={(e) => setSoaRetry(parseInt(e.target.value) || 7200)}
                min={60}
              />
              <p className="text-xs text-surface-500 mt-1">
                Retry interval after failed refresh (default: 7200 = 2 hours)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Expire Time (seconds)
              </label>
              <Input
                type="number"
                value={soaExpire}
                onChange={(e) => setSoaExpire(parseInt(e.target.value) || 3600000)}
                min={60}
              />
              <p className="text-xs text-surface-500 mt-1">
                When secondary server data becomes invalid (default: 3600000 = ~41 days)
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
                TTL for negative responses like NXDOMAIN (default: 172800 = 2 days)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-medium text-surface-900 dark:text-surface-100 mb-4">
            Zone Information
          </h3>

          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <span className="text-surface-500">Zone Name</span>
              <p className="text-surface-900 dark:text-surface-100 font-medium">
                {zone.zoneName}
              </p>
            </div>
            <div>
              <span className="text-surface-500">Status</span>
              <p className="text-surface-900 dark:text-surface-100 font-medium">
                {zone.status}
              </p>
            </div>
            <div>
              <span className="text-surface-500">Created</span>
              <p className="text-surface-900 dark:text-surface-100 font-medium">
                {new Date(zone.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-surface-500">Last Updated</span>
              <p className="text-surface-900 dark:text-surface-100 font-medium">
                {new Date(zone.updatedAt).toLocaleString()}
              </p>
            </div>
            {zone.lastCheckedAt && (
              <div>
                <span className="text-surface-500">Last Checked</span>
                <p className="text-surface-900 dark:text-surface-100 font-medium">
                  {new Date(zone.lastCheckedAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" isLoading={updateZone.isPending}>
          Save Changes
        </Button>
      </div>
    </form>
  );
}
