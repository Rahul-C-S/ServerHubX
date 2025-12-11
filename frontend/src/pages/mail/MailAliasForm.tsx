import { useState, useEffect } from 'react';
import { Button, Modal, Input, Alert, Select } from '@/components/ui';
import { useCreateMailAlias, useUpdateMailAlias } from '@/hooks';
import type { MailDomain, MailAlias, AliasType } from '@/types';

interface MailAliasFormProps {
  mailDomain: MailDomain;
  alias?: MailAlias;
  isOpen: boolean;
  onClose: () => void;
}

const aliasTypeOptions = [
  { value: 'FORWARD', label: 'Forward' },
  { value: 'LOCAL', label: 'Local' },
  { value: 'GROUP', label: 'Group' },
];

export function MailAliasForm({ mailDomain, alias, isOpen, onClose }: MailAliasFormProps) {
  const [source, setSource] = useState('');
  const [destinations, setDestinations] = useState('');
  const [type, setType] = useState<AliasType>('FORWARD' as AliasType);
  const [enabled, setEnabled] = useState(true);
  const [description, setDescription] = useState('');

  const createAlias = useCreateMailAlias();
  const updateAlias = useUpdateMailAlias();

  const isEditing = !!alias;

  useEffect(() => {
    if (alias) {
      // Extract local part from source
      const localPart = alias.source.split('@')[0];
      setSource(localPart);
      setDestinations(alias.destinations.join('\n'));
      setType(alias.type);
      setEnabled(alias.enabled);
      setDescription(alias.description || '');
    } else {
      resetForm();
    }
  }, [alias]);

  const resetForm = () => {
    setSource('');
    setDestinations('');
    setType('FORWARD' as AliasType);
    setEnabled(true);
    setDescription('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const destinationsList = destinations
      .split('\n')
      .map((addr) => addr.trim())
      .filter((addr) => addr.length > 0);

    if (destinationsList.length === 0) {
      return;
    }

    try {
      if (isEditing) {
        await updateAlias.mutateAsync({
          id: alias.id,
          data: {
            destinations: destinationsList,
            type,
            enabled,
            description: description || undefined,
          },
        });
      } else {
        await createAlias.mutateAsync({
          mailDomainId: mailDomain.id,
          data: {
            source: source || '@',
            destinations: destinationsList,
            type,
            enabled,
            description: description || undefined,
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
      title={isEditing ? 'Edit Alias' : 'Create Alias'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Source Address */}
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Source Address *
          </label>
          <div className="flex">
            <Input
              value={source}
              onChange={(e) => setSource(e.target.value.toLowerCase())}
              placeholder="info (or leave empty for catch-all)"
              disabled={isEditing}
              className="rounded-r-none"
            />
            <span className="inline-flex items-center px-3 text-sm text-surface-500 bg-surface-100 dark:bg-surface-700 border border-l-0 border-surface-200 dark:border-surface-600 rounded-r-lg">
              @{mailDomain.domainName}
            </span>
          </div>
          <p className="mt-1 text-xs text-surface-400">
            Leave empty to create a catch-all alias for all unmatched addresses
          </p>
        </div>

        {/* Destinations */}
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Forward To *
          </label>
          <textarea
            value={destinations}
            onChange={(e) => setDestinations(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800"
            placeholder="user@example.com&#10;another@example.com"
            required
          />
          <p className="mt-1 text-xs text-surface-400">
            One email address per line
          </p>
        </div>

        {/* Type */}
        <Select
          label="Alias Type"
          value={type}
          onChange={(e) => setType(e.target.value as AliasType)}
        >
          {aliasTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>

        {/* Description */}
        <Input
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Sales team alias"
        />

        {/* Enabled */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="enabled" className="text-sm text-surface-700 dark:text-surface-300">
            Alias is enabled
          </label>
        </div>

        {(createAlias.error || updateAlias.error) && (
          <Alert variant="error">
            Failed to {isEditing ? 'update' : 'create'} alias.
          </Alert>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={createAlias.isPending || updateAlias.isPending}
          >
            {isEditing ? 'Update Alias' : 'Create Alias'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
