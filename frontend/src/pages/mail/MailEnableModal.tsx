import { useState } from 'react';
import { Mail, Shield } from 'lucide-react';
import { Button, Modal, Input, Alert } from '@/components/ui';
import { useEnableMailForDomain } from '@/hooks';

interface MailEnableModalProps {
  domainId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function MailEnableModal({ domainId, isOpen, onClose }: MailEnableModalProps) {
  const [maxMailboxes, setMaxMailboxes] = useState(100);
  const [maxAliases, setMaxAliases] = useState(100);
  const [defaultQuotaGb, setDefaultQuotaGb] = useState(1);
  const [dkimEnabled, setDkimEnabled] = useState(true);
  const [spamFilterEnabled, setSpamFilterEnabled] = useState(true);
  const [virusScanEnabled, setVirusScanEnabled] = useState(true);

  const enableMail = useEnableMailForDomain();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await enableMail.mutateAsync({
        domainId,
        data: {
          maxMailboxes,
          maxAliases,
          defaultQuotaBytes: defaultQuotaGb * 1024 * 1024 * 1024,
          dkimEnabled,
          spamFilterEnabled,
          virusScanEnabled,
          enabled: true,
        },
      });
      onClose();
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Enable Email for Domain">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Alert variant="info">
          <p className="text-sm">
            This will enable email functionality for this domain. You'll be able
            to create mailboxes and aliases.
          </p>
        </Alert>

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

        <div className="space-y-3">
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
            Security Options
          </label>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="dkimEnabled"
              checked={dkimEnabled}
              onChange={(e) => setDkimEnabled(e.target.checked)}
              className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
            />
            <label
              htmlFor="dkimEnabled"
              className="text-sm text-surface-700 dark:text-surface-300 flex items-center gap-1"
            >
              <Shield className="w-4 h-4" />
              Enable DKIM signing (recommended)
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
            <label
              htmlFor="spamFilterEnabled"
              className="text-sm text-surface-700 dark:text-surface-300"
            >
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
            <label
              htmlFor="virusScanEnabled"
              className="text-sm text-surface-700 dark:text-surface-300"
            >
              Enable virus scanning
            </label>
          </div>
        </div>

        {enableMail.error && (
          <Alert variant="error">
            Failed to enable email. Please try again.
          </Alert>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={enableMail.isPending}>
            <Mail className="w-4 h-4 mr-2" />
            Enable Email
          </Button>
        </div>
      </form>
    </Modal>
  );
}
