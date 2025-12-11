import { useState } from 'react';
import {
  Clock,
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Timer,
} from 'lucide-react';
import {
  Button,
  Input,
  Badge,
  Card,
  CardContent,
  Spinner,
  Modal,
  Alert,
} from '@/components/ui';
import {
  useCronJobs,
  useDeleteCronJob,
  useRunCronJob,
  usePauseCronJob,
  useResumeCronJob,
} from '@/hooks';
import type { CronJob, CronJobStatus } from '@/types';
import { CronJobCreateModal } from './CronJobCreateModal';

const statusConfig: Record<
  CronJobStatus,
  { color: 'success' | 'warning' | 'default'; label: string }
> = {
  ACTIVE: { color: 'success', label: 'Active' },
  PAUSED: { color: 'warning', label: 'Paused' },
  DISABLED: { color: 'default', label: 'Disabled' },
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleString();
}

function describeCron(cron: string): string {
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  if (minute === '*' && hour === '*') {
    return 'Every minute';
  }
  if (minute.startsWith('*/')) {
    return `Every ${minute.slice(2)} minutes`;
  }
  if (minute === '0' && hour === '*') {
    return 'Every hour';
  }
  if (minute === '0' && hour.startsWith('*/')) {
    return `Every ${hour.slice(2)} hours`;
  }
  if (minute === '0' && hour === '0' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return 'Daily at midnight';
  }
  if (dayOfWeek !== '*' && dayOfMonth === '*' && month === '*') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `Weekly on ${days[parseInt(dayOfWeek)] || dayOfWeek}`;
  }

  return cron;
}

export function CronPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<CronJob | null>(null);
  const [runResult, setRunResult] = useState<{ job: CronJob; success: boolean; output?: string; error?: string } | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  const { data: cronJobs, isLoading, error } = useCronJobs();
  const deleteCronJob = useDeleteCronJob();
  const runCronJob = useRunCronJob();
  const pauseCronJob = usePauseCronJob();
  const resumeCronJob = useResumeCronJob();

  const filteredJobs = cronJobs?.filter(
    (job) =>
      job.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.command.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteCronJob.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleRun = async (job: CronJob) => {
    try {
      const result = await runCronJob.mutateAsync(job.id);
      setRunResult({ job, success: result.success, output: result.output, error: result.error });
    } catch (err) {
      setRunResult({ job, success: false, error: 'Failed to run job' });
    }
    setActionMenuOpen(null);
  };

  const handlePause = async (job: CronJob) => {
    await pauseCronJob.mutateAsync(job.id);
    setActionMenuOpen(null);
  };

  const handleResume = async (job: CronJob) => {
    await resumeCronJob.mutateAsync(job.id);
    setActionMenuOpen(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error">Failed to load cron jobs. Please try again later.</Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
            Cron Jobs
          </h1>
          <p className="text-surface-600 dark:text-surface-400 mt-1">
            Schedule and manage automated tasks
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Cron Job
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <Input
          placeholder="Search cron jobs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Cron Jobs List */}
      {filteredJobs && filteredJobs.length > 0 ? (
        <div className="space-y-3">
          {filteredJobs.map((job) => (
            <Card key={job.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        job.status === 'ACTIVE'
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : 'bg-surface-100 dark:bg-surface-800'
                      }`}
                    >
                      <Clock
                        className={`w-5 h-5 ${
                          job.status === 'ACTIVE'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-surface-400'
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-surface-900 dark:text-surface-100">
                          {job.name}
                        </span>
                        <Badge variant={statusConfig[job.status].color} size="sm">
                          {statusConfig[job.status].label}
                        </Badge>
                        {job.lastRunStatus && (
                          <Badge
                            variant={job.lastRunStatus === 'SUCCESS' ? 'success' : 'danger'}
                            size="sm"
                          >
                            {job.lastRunStatus === 'SUCCESS' ? (
                              <CheckCircle className="w-3 h-3 mr-1" />
                            ) : (
                              <XCircle className="w-3 h-3 mr-1" />
                            )}
                            Last: {job.lastRunStatus}
                          </Badge>
                        )}
                      </div>
                      <code className="block mt-1 text-sm text-surface-600 dark:text-surface-400 bg-surface-100 dark:bg-surface-800 px-2 py-1 rounded font-mono">
                        {job.command}
                      </code>
                      <div className="flex items-center gap-4 mt-2 text-sm text-surface-500">
                        <span className="flex items-center gap-1">
                          <Timer className="w-4 h-4" />
                          {describeCron(job.cronExpression)}
                        </span>
                        {job.domain && <span>{job.domain.name}</span>}
                        <span>Run as: {job.runAsUser}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-surface-400">
                        <span>Last run: {formatDate(job.lastRunAt)}</span>
                        <span>Next run: {formatDate(job.nextRunAt)}</span>
                        <span>Runs: {job.runCount}</span>
                        {job.failureCount > 0 && (
                          <span className="text-red-500">Failures: {job.failureCount}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() =>
                        setActionMenuOpen(actionMenuOpen === job.id ? null : job.id)
                      }
                      className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {actionMenuOpen === job.id && (
                      <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 py-1 z-10">
                        <button
                          onClick={() => handleRun(job)}
                          className="w-full px-4 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                          disabled={runCronJob.isPending}
                        >
                          <Play className="w-4 h-4" /> Run Now
                        </button>
                        {job.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handlePause(job)}
                            className="w-full px-4 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                          >
                            <Pause className="w-4 h-4" /> Pause
                          </button>
                        ) : (
                          <button
                            onClick={() => handleResume(job)}
                            className="w-full px-4 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                          >
                            <Play className="w-4 h-4" /> Resume
                          </button>
                        )}
                        <hr className="my-1 border-surface-200 dark:border-surface-700" />
                        <button
                          onClick={() => {
                            setDeleteConfirm(job);
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
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Clock className="w-12 h-12 mx-auto text-surface-300 dark:text-surface-600" />
              <h3 className="mt-4 text-lg font-medium text-surface-900 dark:text-surface-100">
                No cron jobs found
              </h3>
              <p className="mt-2 text-surface-500 dark:text-surface-400">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Create your first cron job to automate tasks'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsCreateModalOpen(true)} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  New Cron Job
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Modal */}
      <CronJobCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Cron Job"
      >
        <div className="space-y-4">
          <p className="text-surface-600 dark:text-surface-400">
            Are you sure you want to delete the cron job &quot;{deleteConfirm?.name}&quot;? This
            action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteCronJob.isPending}
            >
              Delete Cron Job
            </Button>
          </div>
        </div>
      </Modal>

      {/* Run Result Modal */}
      <Modal
        isOpen={!!runResult}
        onClose={() => setRunResult(null)}
        title="Cron Job Execution Result"
      >
        {runResult && (
          <div className="space-y-4">
            <Alert variant={runResult.success ? 'success' : 'error'}>
              {runResult.success
                ? `Job "${runResult.job.name}" executed successfully`
                : `Job "${runResult.job.name}" failed`}
            </Alert>
            {(runResult.output || runResult.error) && (
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Output
                </label>
                <pre className="text-sm bg-surface-100 dark:bg-surface-800 p-3 rounded font-mono overflow-x-auto max-h-64 overflow-y-auto">
                  {runResult.output || runResult.error}
                </pre>
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={() => setRunResult(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
