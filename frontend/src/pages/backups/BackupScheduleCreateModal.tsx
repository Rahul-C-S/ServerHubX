import { useState } from 'react';
import { Modal, Button, Input, Select, Alert } from '@/components/ui';
import { useCreateBackupSchedule, useDomains } from '@/hooks';
import type { BackupType, StorageType } from '@/types';

interface BackupScheduleCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const backupTypes: { value: BackupType; label: string }[] = [
  { value: 'FULL', label: 'Full Backup' },
  { value: 'DATABASE', label: 'Database Only' },
  { value: 'FILES', label: 'Files Only' },
  { value: 'CONFIG', label: 'Configuration Only' },
];

const storageTypes: { value: StorageType; label: string }[] = [
  { value: 'LOCAL', label: 'Local Storage' },
  { value: 'S3', label: 'Amazon S3' },
  { value: 'SFTP', label: 'SFTP Server' },
];

const schedulePresets = [
  { value: '0 0 * * *', label: 'Daily at midnight' },
  { value: '0 0 * * 0', label: 'Weekly on Sunday' },
  { value: '0 0 1 * *', label: 'Monthly on the 1st' },
  { value: '0 */6 * * *', label: 'Every 6 hours' },
  { value: 'custom', label: 'Custom cron expression' },
];

export function BackupScheduleCreateModal({ isOpen, onClose }: BackupScheduleCreateModalProps) {
  const [name, setName] = useState('');
  const [backupType, setBackupType] = useState<BackupType>('FULL');
  const [storageType, setStorageType] = useState<StorageType>('LOCAL');
  const [domainId, setDomainId] = useState('');
  const [schedulePreset, setSchedulePreset] = useState('0 0 * * *');
  const [customCron, setCustomCron] = useState('');
  const [retentionDays, setRetentionDays] = useState('30');
  const [maxBackups, setMaxBackups] = useState('10');
  const [error, setError] = useState('');

  const { data: domains } = useDomains();
  const createSchedule = useCreateBackupSchedule();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cronExpression = schedulePreset === 'custom' ? customCron : schedulePreset;

    if (!cronExpression) {
      setError('Please enter a cron expression');
      return;
    }

    try {
      await createSchedule.mutateAsync({
        name,
        backupType,
        cronExpression,
        storageType,
        domainId: domainId || undefined,
        retentionDays: parseInt(retentionDays, 10),
        maxBackups: parseInt(maxBackups, 10),
        enabled: true,
      });
      onClose();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create schedule');
    }
  };

  const resetForm = () => {
    setName('');
    setBackupType('FULL');
    setStorageType('LOCAL');
    setDomainId('');
    setSchedulePreset('0 0 * * *');
    setCustomCron('');
    setRetentionDays('30');
    setMaxBackups('10');
    setError('');
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Backup Schedule">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Schedule Name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Daily Full Backup"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Backup Type
          </label>
          <Select
            value={backupType}
            onChange={(e) => setBackupType(e.target.value as BackupType)}
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

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Schedule
          </label>
          <Select
            value={schedulePreset}
            onChange={(e) => setSchedulePreset(e.target.value)}
          >
            {schedulePresets.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </div>

        {schedulePreset === 'custom' && (
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Cron Expression
            </label>
            <Input
              value={customCron}
              onChange={(e) => setCustomCron(e.target.value)}
              placeholder="0 0 * * *"
              required
            />
            <p className="text-xs text-surface-500 mt-1">
              Format: minute hour day-of-month month day-of-week
            </p>
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

        <div className="grid grid-cols-2 gap-4">
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
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Max Backups
            </label>
            <Input
              type="number"
              value={maxBackups}
              onChange={(e) => setMaxBackups(e.target.value)}
              min="1"
              max="100"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={createSchedule.isPending}>
            Create Schedule
          </Button>
        </div>
      </form>
    </Modal>
  );
}
