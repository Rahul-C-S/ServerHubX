import { useState } from 'react';
import {
  Calendar,
  Plus,
  MoreVertical,
  Trash2,
  Play,
  Pause,
  CheckCircle,
} from 'lucide-react';
import {
  Button,
  Badge,
  Card,
  CardContent,
  Spinner,
  Modal,
  Alert,
} from '@/components/ui';
import {
  useBackupSchedules,
  useDeleteBackupSchedule,
  useUpdateBackupSchedule,
  useRunBackupSchedule,
} from '@/hooks';
import type { BackupSchedule } from '@/types';

interface BackupSchedulesListProps {
  onCreateClick: () => void;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleString();
}

function describeCron(cron: string): string {
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  if (minute === '0' && hour === '0' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return 'Daily at midnight';
  }
  if (minute === '0' && hour === '0' && dayOfMonth === '*' && month === '*' && dayOfWeek === '0') {
    return 'Weekly on Sunday';
  }
  if (minute === '0' && hour === '0' && dayOfMonth === '1' && month === '*' && dayOfWeek === '*') {
    return 'Monthly on the 1st';
  }
  if (minute === '0' && hour.startsWith('*/')) {
    return `Every ${hour.slice(2)} hours`;
  }

  return cron;
}

export function BackupSchedulesList({ onCreateClick }: BackupSchedulesListProps) {
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<BackupSchedule | null>(null);

  const { data: schedules, isLoading, error } = useBackupSchedules();
  const deleteSchedule = useDeleteBackupSchedule();
  const updateSchedule = useUpdateBackupSchedule();
  const runSchedule = useRunBackupSchedule();

  const handleToggleEnabled = async (schedule: BackupSchedule) => {
    await updateSchedule.mutateAsync({
      id: schedule.id,
      data: { enabled: !schedule.enabled },
    });
    setActionMenuOpen(null);
  };

  const handleRunNow = async (schedule: BackupSchedule) => {
    await runSchedule.mutateAsync(schedule.id);
    setActionMenuOpen(null);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteSchedule.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);
    } catch {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <Alert variant="error">Failed to load schedules.</Alert>;
  }

  if (!schedules || schedules.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Calendar className="w-12 h-12 mx-auto text-surface-300 dark:text-surface-600" />
            <h3 className="mt-4 text-lg font-medium text-surface-900 dark:text-surface-100">
              No backup schedules
            </h3>
            <p className="mt-2 text-surface-500 dark:text-surface-400">
              Create a schedule to automate your backups
            </p>
            <Button onClick={onCreateClick} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Create Schedule
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {schedules.map((schedule) => (
        <Card key={schedule.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-surface-900 dark:text-surface-100">
                      {schedule.name}
                    </span>
                    <Badge
                      variant={schedule.enabled ? 'success' : 'default'}
                      size="sm"
                    >
                      {schedule.enabled ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-surface-500">
                    <span>{describeCron(schedule.cronExpression)}</span>
                    <span>{schedule.backupType}</span>
                    {schedule.domain && <span>{schedule.domain.name}</span>}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-surface-400">
                    <span>Last run: {formatDate(schedule.lastRunAt)}</span>
                    <span>Next run: {formatDate(schedule.nextRunAt)}</span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <button
                  onClick={() =>
                    setActionMenuOpen(actionMenuOpen === schedule.id ? null : schedule.id)
                  }
                  className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {actionMenuOpen === schedule.id && (
                  <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 py-1 z-10">
                    <button
                      onClick={() => handleRunNow(schedule)}
                      className="w-full px-4 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" /> Run Now
                    </button>
                    <button
                      onClick={() => handleToggleEnabled(schedule)}
                      className="w-full px-4 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                    >
                      {schedule.enabled ? (
                        <>
                          <Pause className="w-4 h-4" /> Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" /> Enable
                        </>
                      )}
                    </button>
                    <hr className="my-1 border-surface-200 dark:border-surface-700" />
                    <button
                      onClick={() => {
                        setDeleteConfirm(schedule);
                        setActionMenuOpen(null);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Schedule"
      >
        <div className="space-y-4">
          <p className="text-surface-600 dark:text-surface-400">
            Are you sure you want to delete the schedule &quot;{deleteConfirm?.name}&quot;? This
            will not delete existing backups.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteSchedule.isPending}
            >
              Delete Schedule
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
