import { useState } from 'react';
import { Modal, Button, Input, Select, Alert } from '@/components/ui';
import { useCreateCronJob, useDomains } from '@/hooks';

interface CronJobCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const schedulePresets = [
  { value: '* * * * *', label: 'Every minute' },
  { value: '*/5 * * * *', label: 'Every 5 minutes' },
  { value: '*/15 * * * *', label: 'Every 15 minutes' },
  { value: '0 * * * *', label: 'Every hour' },
  { value: '0 */6 * * *', label: 'Every 6 hours' },
  { value: '0 0 * * *', label: 'Daily at midnight' },
  { value: '0 0 * * 0', label: 'Weekly on Sunday' },
  { value: '0 0 1 * *', label: 'Monthly on the 1st' },
  { value: 'custom', label: 'Custom cron expression' },
];

export function CronJobCreateModal({ isOpen, onClose }: CronJobCreateModalProps) {
  const [name, setName] = useState('');
  const [command, setCommand] = useState('');
  const [description, setDescription] = useState('');
  const [domainId, setDomainId] = useState('');
  const [schedulePreset, setSchedulePreset] = useState('0 0 * * *');
  const [customCron, setCustomCron] = useState('');
  const [timeout, setTimeout] = useState('3600');
  const [captureOutput, setCaptureOutput] = useState(true);
  const [notifyOnFailure, setNotifyOnFailure] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [error, setError] = useState('');

  const { data: domains } = useDomains();
  const createCronJob = useCreateCronJob();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!domainId) {
      setError('Please select a domain');
      return;
    }

    const cronExpression = schedulePreset === 'custom' ? customCron : schedulePreset;

    if (!cronExpression) {
      setError('Please enter a cron expression');
      return;
    }

    try {
      await createCronJob.mutateAsync({
        name,
        command,
        cronExpression,
        domainId,
        description: description || undefined,
        timeout: parseInt(timeout, 10),
        captureOutput,
        notifyOnFailure,
        notifyEmail: notifyOnFailure && notifyEmail ? notifyEmail : undefined,
      });
      onClose();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create cron job');
    }
  };

  const resetForm = () => {
    setName('');
    setCommand('');
    setDescription('');
    setDomainId('');
    setSchedulePreset('0 0 * * *');
    setCustomCron('');
    setTimeout('3600');
    setCaptureOutput(true);
    setNotifyOnFailure(true);
    setNotifyEmail('');
    setError('');
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Cron Job">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Job Name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Database Cleanup"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Domain
          </label>
          <Select
            value={domainId}
            onChange={(e) => setDomainId(e.target.value)}
            required
          >
            <option value="">Select a domain</option>
            {domains?.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Command
          </label>
          <Input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="e.g., /usr/bin/php /home/user/scripts/cleanup.php"
            required
          />
          <p className="text-xs text-surface-500 mt-1">
            Full path to the script or command to execute
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Description (Optional)
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of what this job does"
          />
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
              placeholder="* * * * *"
              required
            />
            <p className="text-xs text-surface-500 mt-1">
              Format: minute hour day-of-month month day-of-week
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Timeout (seconds)
          </label>
          <Input
            type="number"
            value={timeout}
            onChange={(e) => setTimeout(e.target.value)}
            min="1"
            max="86400"
          />
          <p className="text-xs text-surface-500 mt-1">
            Maximum execution time before the job is killed
          </p>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={captureOutput}
              onChange={(e) => setCaptureOutput(e.target.checked)}
              className="rounded border-surface-300"
            />
            <span className="text-sm text-surface-700 dark:text-surface-300">
              Capture output
            </span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={notifyOnFailure}
              onChange={(e) => setNotifyOnFailure(e.target.checked)}
              className="rounded border-surface-300"
            />
            <span className="text-sm text-surface-700 dark:text-surface-300">
              Notify on failure
            </span>
          </label>

          {notifyOnFailure && (
            <div className="ml-6">
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Notification Email (Optional)
              </label>
              <Input
                type="email"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={createCronJob.isPending}>
            Create Cron Job
          </Button>
        </div>
      </form>
    </Modal>
  );
}
