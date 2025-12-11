import { useState } from 'react';
import { Modal, Button, Input, Select, Alert } from '@/components/ui';
import { useCreateAlertRule } from '@/hooks';
import type { AlertMetric, AlertOperator, AlertSeverity } from '@/types';

interface AlertRuleCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const metricOptions: { value: AlertMetric; label: string }[] = [
  { value: 'CPU_USAGE', label: 'CPU Usage (%)' },
  { value: 'MEMORY_USAGE', label: 'Memory Usage (%)' },
  { value: 'DISK_USAGE', label: 'Disk Usage (%)' },
  { value: 'NETWORK_IN', label: 'Network In (bytes)' },
  { value: 'NETWORK_OUT', label: 'Network Out (bytes)' },
  { value: 'SERVICE_STATUS', label: 'Service Status' },
  { value: 'APP_STATUS', label: 'App Status' },
  { value: 'APP_MEMORY', label: 'App Memory (MB)' },
  { value: 'APP_CPU', label: 'App CPU (%)' },
  { value: 'APP_RESTARTS', label: 'App Restarts' },
];

const operatorOptions: { value: AlertOperator; label: string }[] = [
  { value: 'GREATER_THAN', label: 'Greater than (>)' },
  { value: 'GREATER_THAN_OR_EQUAL', label: 'Greater than or equal (>=)' },
  { value: 'LESS_THAN', label: 'Less than (<)' },
  { value: 'LESS_THAN_OR_EQUAL', label: 'Less than or equal (<=)' },
  { value: 'EQUALS', label: 'Equals (=)' },
  { value: 'NOT_EQUALS', label: 'Not equals (!=)' },
];

const severityOptions: { value: AlertSeverity; label: string }[] = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' },
];

export function AlertRuleCreateModal({ isOpen, onClose }: AlertRuleCreateModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [metric, setMetric] = useState<AlertMetric>('CPU_USAGE');
  const [operator, setOperator] = useState<AlertOperator>('GREATER_THAN');
  const [threshold, setThreshold] = useState('80');
  const [durationSeconds, setDurationSeconds] = useState('60');
  const [cooldownSeconds, setCooldownSeconds] = useState('300');
  const [severity, setSeverity] = useState<AlertSeverity>('warning');
  const [error, setError] = useState('');

  const createRule = useCreateAlertRule();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await createRule.mutateAsync({
        name,
        description: description || undefined,
        metric,
        operator,
        threshold: parseFloat(threshold),
        durationSeconds: parseInt(durationSeconds, 10),
        cooldownSeconds: parseInt(cooldownSeconds, 10),
        severity,
        enabled: true,
      });
      onClose();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create alert rule');
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setMetric('CPU_USAGE');
    setOperator('GREATER_THAN');
    setThreshold('80');
    setDurationSeconds('60');
    setCooldownSeconds('300');
    setSeverity('warning');
    setError('');
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Alert Rule">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Rule Name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., High CPU Alert"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Description (Optional)
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this alert"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Metric
          </label>
          <Select
            value={metric}
            onChange={(e) => setMetric(e.target.value as AlertMetric)}
          >
            {metricOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Operator
            </label>
            <Select
              value={operator}
              onChange={(e) => setOperator(e.target.value as AlertOperator)}
            >
              {operatorOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Threshold
            </label>
            <Input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              step="0.1"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Duration (seconds)
            </label>
            <Input
              type="number"
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(e.target.value)}
              min="0"
              required
            />
            <p className="text-xs text-surface-500 mt-1">
              How long condition must be true before alerting
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Cooldown (seconds)
            </label>
            <Input
              type="number"
              value={cooldownSeconds}
              onChange={(e) => setCooldownSeconds(e.target.value)}
              min="0"
              required
            />
            <p className="text-xs text-surface-500 mt-1">
              Minimum time between alerts
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Severity
          </label>
          <Select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as AlertSeverity)}
          >
            {severityOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={createRule.isPending}>
            Create Rule
          </Button>
        </div>
      </form>
    </Modal>
  );
}
