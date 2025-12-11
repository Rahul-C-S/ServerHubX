import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Trash2, Shield, Mail } from 'lucide-react';
import { Button, Card, CardContent, Input, Alert, Modal } from '@/components/ui';
import { useUpdateMailDomain, useDisableMailForDomain } from '@/hooks';
import type { MailDomain } from '@/types';

interface MailSettingsTabProps {
  mailDomain: MailDomain;
}

export function MailSettingsTab({ mailDomain }: MailSettingsTabProps) {
  const navigate = useNavigate();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Form state
  const [maxMailboxes, setMaxMailboxes] = useState(mailDomain.maxMailboxes);
  const [maxAliases, setMaxAliases] = useState(mailDomain.maxAliases);
  const [defaultQuotaGb, setDefaultQuotaGb] = useState(
    mailDomain.defaultQuotaBytes / (1024 * 1024 * 1024)
  );
  const [enabled, setEnabled] = useState(mailDomain.enabled);
  const [dkimEnabled, setDkimEnabled] = useState(mailDomain.dkimEnabled);
  const [spamFilterEnabled, setSpamFilterEnabled] = useState(mailDomain.spamFilterEnabled);
  const [virusScanEnabled, setVirusScanEnabled] = useState(mailDomain.virusScanEnabled);
  const [catchAllEnabled, setCatchAllEnabled] = useState(mailDomain.catchAllEnabled);
  const [catchAllAddress, setCatchAllAddress] = useState(mailDomain.catchAllAddress || '');

  const updateMailDomain = useUpdateMailDomain();
  const disableMailForDomain = useDisableMailForDomain();

  const handleSave = async () => {
    try {
      await updateMailDomain.mutateAsync({
        id: mailDomain.id,
        data: {
          maxMailboxes,
          maxAliases,
          defaultQuotaBytes: defaultQuotaGb * 1024 * 1024 * 1024,
          enabled,
          dkimEnabled,
          spamFilterEnabled,
          virusScanEnabled,
          catchAllEnabled,
          catchAllAddress: catchAllAddress || undefined,
        },
      });
    } catch {
      // Error handled by mutation
    }
  };

  const handleDisable = async () => {
    try {
      await disableMailForDomain.mutateAsync(mailDomain.id);
      navigate('/mail');
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-medium text-surface-900 dark:text-surface-100 mb-4">
            General Settings
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enabled"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="enabled" className="text-sm text-surface-700 dark:text-surface-300">
                Email is enabled for this domain
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Max Mailboxes"
                type="number"
                min="0"
                value={maxMailboxes}
                onChange={(e) => setMaxMailboxes(parseInt(e.target.value) || 0)}
                hint="0 for unlimited"
              />
              <Input
                label="Max Aliases"
                type="number"
                min="0"
                value={maxAliases}
                onChange={(e) => setMaxAliases(parseInt(e.target.value) || 0)}
                hint="0 for unlimited"
              />
            </div>

            <Input
              label="Default Mailbox Quota (GB)"
              type="number"
              min="0.1"
              step="0.1"
              value={defaultQuotaGb}
              onChange={(e) => setDefaultQuotaGb(parseFloat(e.target.value) || 1)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-surface-500" />
            <h3 className="text-lg font-medium text-surface-900 dark:text-surface-100">
              Security Settings
            </h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="dkimEnabled"
                checked={dkimEnabled}
                onChange={(e) => setDkimEnabled(e.target.checked)}
                className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="dkimEnabled" className="text-sm text-surface-700 dark:text-surface-300">
                Enable DKIM signing (DomainKeys Identified Mail)
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="spamFilterEnabled"
                checked={spamFilterEnabled}
                onChange={(e) => setSpamFilterEnabled(e.target.checked)}
                className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="spamFilterEnabled" className="text-sm text-surface-700 dark:text-surface-300">
                Enable spam filtering
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="virusScanEnabled"
                checked={virusScanEnabled}
                onChange={(e) => setVirusScanEnabled(e.target.checked)}
                className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="virusScanEnabled" className="text-sm text-surface-700 dark:text-surface-300">
                Enable virus scanning
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Catch-All Settings */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5 text-surface-500" />
            <h3 className="text-lg font-medium text-surface-900 dark:text-surface-100">
              Catch-All Address
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="catchAllEnabled"
                checked={catchAllEnabled}
                onChange={(e) => setCatchAllEnabled(e.target.checked)}
                className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="catchAllEnabled" className="text-sm text-surface-700 dark:text-surface-300">
                Enable catch-all address
              </label>
            </div>

            {catchAllEnabled && (
              <Input
                label="Forward unmatched emails to"
                type="email"
                value={catchAllAddress}
                onChange={(e) => setCatchAllAddress(e.target.value)}
                placeholder="admin@example.com"
              />
            )}
            <p className="text-sm text-surface-400">
              Catch-all will receive emails sent to any non-existent address at this domain.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="danger"
          onClick={() => setIsDeleteModalOpen(true)}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Disable Email for Domain
        </Button>

        <Button onClick={handleSave} isLoading={updateMailDomain.isPending}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {updateMailDomain.isSuccess && (
        <Alert variant="success">Settings saved successfully.</Alert>
      )}

      {updateMailDomain.error && (
        <Alert variant="error">Failed to save settings.</Alert>
      )}

      {/* Disable Confirmation */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Disable Email for Domain"
      >
        <div className="space-y-4">
          <p className="text-surface-600 dark:text-surface-400">
            Are you sure you want to disable email for{' '}
            <span className="font-medium text-surface-900 dark:text-surface-100">
              {mailDomain.domainName}
            </span>
            ?
          </p>
          <Alert variant="warning">
            <div>
              <p className="font-medium">This action cannot be undone easily.</p>
              <ul className="list-disc list-inside text-sm mt-1">
                <li>All mailboxes must be deleted first</li>
                <li>DKIM keys will be regenerated if re-enabled</li>
              </ul>
            </div>
          </Alert>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDisable}
              isLoading={disableMailForDomain.isPending}
            >
              Disable Email
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
