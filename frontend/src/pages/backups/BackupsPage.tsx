import { useState } from 'react';
import {
  HardDrive,
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Download,
  RotateCcw,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Calendar,
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui';
import {
  useBackups,
  useBackupSchedules,
  useDeleteBackup,
  useRestoreBackup,
  useDownloadBackup,
} from '@/hooks';
import type { Backup, BackupStatus, BackupType } from '@/types';
import { BackupCreateModal } from './BackupCreateModal';
import { BackupScheduleCreateModal } from './BackupScheduleCreateModal';
import { BackupSchedulesList } from './BackupSchedulesList';

const statusConfig: Record<BackupStatus, { color: 'success' | 'warning' | 'danger' | 'default'; icon: typeof CheckCircle }> = {
  COMPLETED: { color: 'success', icon: CheckCircle },
  IN_PROGRESS: { color: 'warning', icon: Loader2 },
  PENDING: { color: 'default', icon: Clock },
  FAILED: { color: 'danger', icon: XCircle },
  CANCELLED: { color: 'default', icon: XCircle },
};

const typeLabels: Record<BackupType, string> = {
  FULL: 'Full Backup',
  DATABASE: 'Database',
  FILES: 'Files',
  CONFIG: 'Configuration',
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

export function BackupsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Backup | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState<Backup | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('backups');

  const { data: backups, isLoading, error } = useBackups();
  const { data: schedules } = useBackupSchedules();
  const deleteBackup = useDeleteBackup();
  const restoreBackup = useRestoreBackup();
  const downloadBackup = useDownloadBackup();

  const filteredBackups = backups?.filter(
    (backup) =>
      backup.domain?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      backup.database?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      backup.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteBackup.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleRestore = async () => {
    if (!restoreConfirm) return;
    try {
      await restoreBackup.mutateAsync(restoreConfirm.id);
      setRestoreConfirm(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleDownload = async (backup: Backup) => {
    try {
      const result = await downloadBackup.mutateAsync(backup.id);
      window.open(result.url, '_blank');
    } catch {
      // Error handled by mutation
    }
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
      <Alert variant="error">Failed to load backups. Please try again later.</Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
            Backups
          </h1>
          <p className="text-surface-600 dark:text-surface-400 mt-1">
            Manage backups and restore points
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIsScheduleModalOpen(true)}>
            <Calendar className="w-4 h-4 mr-2" />
            New Schedule
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Backup
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="backups">
            Backups ({backups?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="schedules">
            Schedules ({schedules?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="backups" className="mt-4">
          {/* Search */}
          <div className="relative max-w-md mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <Input
              placeholder="Search backups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Backups List */}
          {filteredBackups && filteredBackups.length > 0 ? (
            <div className="space-y-3">
              {filteredBackups.map((backup) => {
                const StatusIcon = statusConfig[backup.status].icon;
                return (
                  <Card key={backup.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <HardDrive className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-surface-900 dark:text-surface-100">
                                {backup.domain?.name || backup.database?.name || backup.app?.name || 'System Backup'}
                              </span>
                              <Badge variant={statusConfig[backup.status].color} size="sm">
                                <StatusIcon className={`w-3 h-3 mr-1 ${backup.status === 'IN_PROGRESS' ? 'animate-spin' : ''}`} />
                                {backup.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-sm text-surface-500">
                              <span>{typeLabels[backup.type]}</span>
                              <span>{formatBytes(backup.sizeBytes)}</span>
                              <span>{formatDate(backup.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="relative">
                          <button
                            onClick={() =>
                              setActionMenuOpen(actionMenuOpen === backup.id ? null : backup.id)
                            }
                            className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {actionMenuOpen === backup.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 py-1 z-10">
                              {backup.status === 'COMPLETED' && (
                                <>
                                  <button
                                    onClick={() => {
                                      setRestoreConfirm(backup);
                                      setActionMenuOpen(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                                  >
                                    <RotateCcw className="w-4 h-4" /> Restore
                                  </button>
                                  <button
                                    onClick={() => handleDownload(backup)}
                                    className="w-full px-4 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                                  >
                                    <Download className="w-4 h-4" /> Download
                                  </button>
                                  <hr className="my-1 border-surface-200 dark:border-surface-700" />
                                </>
                              )}
                              <button
                                onClick={() => {
                                  setDeleteConfirm(backup);
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
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <HardDrive className="w-12 h-12 mx-auto text-surface-300 dark:text-surface-600" />
                  <h3 className="mt-4 text-lg font-medium text-surface-900 dark:text-surface-100">
                    No backups found
                  </h3>
                  <p className="mt-2 text-surface-500 dark:text-surface-400">
                    {searchQuery
                      ? 'Try adjusting your search query'
                      : 'Create your first backup to protect your data'}
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => setIsCreateModalOpen(true)} className="mt-4">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Backup
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="schedules" className="mt-4">
          <BackupSchedulesList onCreateClick={() => setIsScheduleModalOpen(true)} />
        </TabsContent>
      </Tabs>

      {/* Create Backup Modal */}
      <BackupCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Create Schedule Modal */}
      <BackupScheduleCreateModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Backup"
      >
        <div className="space-y-4">
          <p className="text-surface-600 dark:text-surface-400">
            Are you sure you want to delete this backup? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteBackup.isPending}
            >
              Delete Backup
            </Button>
          </div>
        </div>
      </Modal>

      {/* Restore Confirmation Modal */}
      <Modal
        isOpen={!!restoreConfirm}
        onClose={() => setRestoreConfirm(null)}
        title="Restore Backup"
      >
        <div className="space-y-4">
          <Alert variant="warning">
            This will overwrite existing data with the backup contents. Make sure you have a
            recent backup before proceeding.
          </Alert>
          <p className="text-surface-600 dark:text-surface-400">
            Are you sure you want to restore from this backup?
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setRestoreConfirm(null)}>
              Cancel
            </Button>
            <Button onClick={handleRestore} isLoading={restoreBackup.isPending}>
              Restore Backup
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
