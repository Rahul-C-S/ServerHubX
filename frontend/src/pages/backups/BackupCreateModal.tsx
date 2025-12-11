import { useState } from 'react';
import { Modal, Button, Input, Select, Alert } from '@/components/ui';
import { useCreateBackup, useDomains, useDatabases } from '@/hooks';
import type { BackupType, StorageType } from '@/types';

interface BackupCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const backupTypes: { value: BackupType; label: string }[] = [
  { value: 'FULL', label: 'Full Backup (All data)' },
  { value: 'DATABASE', label: 'Database Only' },
  { value: 'FILES', label: 'Files Only' },
  { value: 'CONFIG', label: 'Configuration Only' },
];

const storageTypes: { value: StorageType; label: string }[] = [
  { value: 'LOCAL', label: 'Local Storage' },
  { value: 'S3', label: 'Amazon S3' },
  { value: 'SFTP', label: 'SFTP Server' },
];

export function BackupCreateModal({ isOpen, onClose }: BackupCreateModalProps) {
  const [type, setType] = useState<BackupType>('FULL');
  const [storageType, setStorageType] = useState<StorageType>('LOCAL');
  const [domainId, setDomainId] = useState('');
  const [databaseId, setDatabaseId] = useState('');
  const [retentionDays, setRetentionDays] = useState('30');
  const [error, setError] = useState('');

  const { data: domains } = useDomains();
  const { data: databases } = useDatabases();
  const createBackup = useCreateBackup();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await createBackup.mutateAsync({
        type,
        storageType,
        domainId: domainId || undefined,
        databaseId: type === 'DATABASE' ? databaseId : undefined,
        retentionDays: parseInt(retentionDays, 10),
      });
      onClose();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create backup');
    }
  };

  const resetForm = () => {
    setType('FULL');
    setStorageType('LOCAL');
    setDomainId('');
    setDatabaseId('');
    setRetentionDays('30');
    setError('');
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Backup">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Backup Type
          </label>
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as BackupType)}
          >
            {backupTypes.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Domain (Optional)
          </label>
          <Select
            value={domainId}
            onChange={(e) => setDomainId(e.target.value)}
          >
            <option value="">All Domains</option>
            {domains?.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
        </div>

        {type === 'DATABASE' && (
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Database
            </label>
            <Select
              value={databaseId}
              onChange={(e) => setDatabaseId(e.target.value)}
              required
            >
              <option value="">Select a database</option>
              {databases?.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Storage Location
          </label>
          <Select
            value={storageType}
            onChange={(e) => setStorageType(e.target.value as StorageType)}
          >
            {storageTypes.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Retention (Days)
          </label>
          <Input
            type="number"
            value={retentionDays}
            onChange={(e) => setRetentionDays(e.target.value)}
            min="1"
            max="365"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={createBackup.isPending}>
            Create Backup
          </Button>
        </div>
      </form>
    </Modal>
  );
}
