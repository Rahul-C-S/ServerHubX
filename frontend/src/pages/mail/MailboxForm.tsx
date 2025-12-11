import { useState, useEffect } from 'react';
import { Button, Modal, Input, Alert } from '@/components/ui';
import { useCreateMailbox, useUpdateMailbox } from '@/hooks';
import type { MailDomain, Mailbox } from '@/types';

interface MailboxFormProps {
  mailDomain: MailDomain;
  mailbox?: Mailbox;
  isOpen: boolean;
  onClose: () => void;
}

export function MailboxForm({ mailDomain, mailbox, isOpen, onClose }: MailboxFormProps) {
  const [localPart, setLocalPart] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [quotaGb, setQuotaGb] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [forwardingEnabled, setForwardingEnabled] = useState(false);
  const [forwardingAddresses, setForwardingAddresses] = useState('');
  const [keepLocalCopy, setKeepLocalCopy] = useState(true);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoReplySubject, setAutoReplySubject] = useState('');
  const [autoReplyMessage, setAutoReplyMessage] = useState('');
  const [formError, setFormError] = useState('');

  const createMailbox = useCreateMailbox();
  const updateMailbox = useUpdateMailbox();

  const isEditing = !!mailbox;

  useEffect(() => {
    if (mailbox) {
      setLocalPart(mailbox.localPart);
      setDisplayName(mailbox.displayName || '');
      setQuotaGb(mailbox.quotaBytes / (1024 * 1024 * 1024));
      setIsActive(mailbox.isActive);
      setForwardingEnabled(mailbox.forwardingEnabled);
      setForwardingAddresses(mailbox.forwardingAddresses.join('\n'));
      setKeepLocalCopy(mailbox.keepLocalCopy);
      setAutoReplyEnabled(mailbox.autoReplyEnabled);
      setAutoReplySubject(mailbox.autoReplySubject || '');
      setAutoReplyMessage(mailbox.autoReplyMessage || '');
    } else {
      resetForm();
    }
  }, [mailbox]);

  const resetForm = () => {
    setLocalPart('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
    setQuotaGb(mailDomain.defaultQuotaBytes / (1024 * 1024 * 1024));
    setIsActive(true);
    setForwardingEnabled(false);
    setForwardingAddresses('');
    setKeepLocalCopy(true);
    setAutoReplyEnabled(false);
    setAutoReplySubject('');
    setAutoReplyMessage('');
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validation
    if (!isEditing && password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    if (!isEditing && password.length < 8) {
      setFormError('Password must be at least 8 characters');
      return;
    }

    const forwardingAddressesList = forwardingAddresses
      .split('\n')
      .map((addr) => addr.trim())
      .filter((addr) => addr.length > 0);

    try {
      if (isEditing) {
        await updateMailbox.mutateAsync({
          id: mailbox.id,
          data: {
            password: password || undefined,
            displayName: displayName || undefined,
            quotaBytes: quotaGb * 1024 * 1024 * 1024,
            isActive,
            forwardingEnabled,
            forwardingAddresses: forwardingAddressesList,
            keepLocalCopy,
            autoReplyEnabled,
            autoReplySubject: autoReplySubject || undefined,
            autoReplyMessage: autoReplyMessage || undefined,
          },
        });
      } else {
        await createMailbox.mutateAsync({
          mailDomainId: mailDomain.id,
          data: {
            localPart,
            password,
            displayName: displayName || undefined,
            quotaBytes: quotaGb * 1024 * 1024 * 1024,
            isActive,
            forwardingEnabled,
            forwardingAddresses: forwardingAddressesList,
            keepLocalCopy,
            autoReplyEnabled,
            autoReplySubject: autoReplySubject || undefined,
            autoReplyMessage: autoReplyMessage || undefined,
          },
        });
      }
      handleClose();
    } catch {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Mailbox' : 'Create Mailbox'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Address */}
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Email Address *
          </label>
          <div className="flex">
            <Input
              value={localPart}
              onChange={(e) => setLocalPart(e.target.value.toLowerCase())}
              placeholder="username"
              disabled={isEditing}
              required={!isEditing}
              className="rounded-r-none"
            />
            <span className="inline-flex items-center px-3 text-sm text-surface-500 bg-surface-100 dark:bg-surface-700 border border-l-0 border-surface-200 dark:border-surface-600 rounded-r-lg">
              @{mailDomain.domainName}
            </span>
          </div>
        </div>

        {/* Password */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={isEditing ? 'New Password' : 'Password *'}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isEditing ? 'Leave blank to keep current' : ''}
            required={!isEditing}
          />
          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required={!isEditing && !!password}
          />
        </div>

        {/* Display Name */}
        <Input
          label="Display Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="John Doe"
        />

        {/* Quota */}
        <Input
          label="Quota (GB)"
          type="number"
          min="0.1"
          step="0.1"
          value={quotaGb}
          onChange={(e) => setQuotaGb(parseFloat(e.target.value) || 1)}
        />

        {/* Status */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="isActive" className="text-sm text-surface-700 dark:text-surface-300">
            Mailbox is active
          </label>
        </div>

        {/* Forwarding */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="forwardingEnabled"
              checked={forwardingEnabled}
              onChange={(e) => setForwardingEnabled(e.target.checked)}
              className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="forwardingEnabled" className="text-sm text-surface-700 dark:text-surface-300">
              Enable email forwarding
            </label>
          </div>
          {forwardingEnabled && (
            <>
              <textarea
                value={forwardingAddresses}
                onChange={(e) => setForwardingAddresses(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800"
                placeholder="One email address per line"
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="keepLocalCopy"
                  checked={keepLocalCopy}
                  onChange={(e) => setKeepLocalCopy(e.target.checked)}
                  className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="keepLocalCopy" className="text-sm text-surface-700 dark:text-surface-300">
                  Keep local copy
                </label>
              </div>
            </>
          )}
        </div>

        {/* Auto-reply */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoReplyEnabled"
              checked={autoReplyEnabled}
              onChange={(e) => setAutoReplyEnabled(e.target.checked)}
              className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="autoReplyEnabled" className="text-sm text-surface-700 dark:text-surface-300">
              Enable auto-reply (vacation message)
            </label>
          </div>
          {autoReplyEnabled && (
            <>
              <Input
                label="Subject"
                value={autoReplySubject}
                onChange={(e) => setAutoReplySubject(e.target.value)}
                placeholder="Out of office"
              />
              <textarea
                value={autoReplyMessage}
                onChange={(e) => setAutoReplyMessage(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800"
                placeholder="Auto-reply message"
              />
            </>
          )}
        </div>

        {formError && <Alert variant="error">{formError}</Alert>}
        {(createMailbox.error || updateMailbox.error) && (
          <Alert variant="error">
            Failed to {isEditing ? 'update' : 'create'} mailbox.
          </Alert>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={createMailbox.isPending || updateMailbox.isPending}
          >
            {isEditing ? 'Update Mailbox' : 'Create Mailbox'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
