import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Plus,
  Search,
  MoreVertical,
  Play,
  Square,
  RefreshCw,
  Trash2,
  Settings,
  Rocket,
  Terminal,
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
  useApps,
  useDeleteApp,
  useStartApp,
  useStopApp,
  useRestartApp,
  useDeployApp,
} from '@/hooks';
import type { App, AppStatus, AppType } from '@/types';
import { AppCreateModal } from './AppCreateModal';

const statusColors: Record<AppStatus, 'success' | 'warning' | 'danger' | 'default'> = {
  RUNNING: 'success',
  PENDING: 'warning',
  DEPLOYING: 'warning',
  STOPPED: 'default',
  ERROR: 'danger',
  MAINTENANCE: 'warning',
};

const typeColors: Record<AppType, string> = {
  NODEJS: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PHP: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  STATIC: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  PYTHON: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};

export function AppsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<App | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  const { data: apps, isLoading, error } = useApps();
  const deleteApp = useDeleteApp();
  const startApp = useStartApp();
  const stopApp = useStopApp();
  const restartApp = useRestartApp();
  const deployApp = useDeployApp();

  const filteredApps = apps?.filter((app) =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteApp.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);
    } catch (err) {
      // Error handled by mutation
    }
  };

  const handleStart = async (app: App) => {
    await startApp.mutateAsync(app.id);
    setActionMenuOpen(null);
  };

  const handleStop = async (app: App) => {
    await stopApp.mutateAsync(app.id);
    setActionMenuOpen(null);
  };

  const handleRestart = async (app: App) => {
    await restartApp.mutateAsync(app.id);
    setActionMenuOpen(null);
  };

  const handleDeploy = async (app: App) => {
    await deployApp.mutateAsync(app.id);
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
      <Alert variant="error">
        Failed to load applications. Please try again later.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
            Applications
          </h1>
          <p className="text-surface-600 dark:text-surface-400 mt-1">
            Manage your Node.js, PHP, and static applications
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Application
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <Input
          placeholder="Search applications..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Apps Grid */}
      {filteredApps && filteredApps.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredApps.map((app) => (
            <Card key={app.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeColors[app.type]}`}
                    >
                      <Box className="w-5 h-5" />
                    </div>
                    <div>
                      <Link
                        to={`/apps/${app.id}`}
                        className="font-medium text-surface-900 dark:text-surface-100 hover:text-primary-600 dark:hover:text-primary-400"
                      >
                        {app.name}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={statusColors[app.status]} size="sm">
                          {app.status}
                        </Badge>
                        <span className="text-xs text-surface-500">
                          {app.type}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() =>
                        setActionMenuOpen(
                          actionMenuOpen === app.id ? null : app.id
                        )
                      }
                      className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {actionMenuOpen === app.id && (
                      <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 py-1 z-10">
                        {app.type === 'NODEJS' && (
                          <>
                            {app.status === 'STOPPED' ? (
                              <button
                                onClick={() => handleStart(app)}
                                className="w-full px-4 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                              >
                                <Play className="w-4 h-4" /> Start
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStop(app)}
                                className="w-full px-4 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                              >
                                <Square className="w-4 h-4" /> Stop
                              </button>
                            )}
                            <button
                              onClick={() => handleRestart(app)}
                              className="w-full px-4 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                            >
                              <RefreshCw className="w-4 h-4" /> Restart
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDeploy(app)}
                          className="w-full px-4 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                        >
                          <Rocket className="w-4 h-4" /> Deploy
                        </button>
                        <Link
                          to={`/apps/${app.id}/logs`}
                          className="w-full px-4 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                        >
                          <Terminal className="w-4 h-4" /> View Logs
                        </Link>
                        <Link
                          to={`/apps/${app.id}`}
                          className="w-full px-4 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                        >
                          <Settings className="w-4 h-4" /> Settings
                        </Link>
                        <hr className="my-1 border-surface-200 dark:border-surface-700" />
                        <button
                          onClick={() => {
                            setDeleteConfirm(app);
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

                {/* App Details */}
                <div className="mt-4 space-y-2 text-sm text-surface-600 dark:text-surface-400">
                  {app.domain && (
                    <div className="flex justify-between">
                      <span>Domain</span>
                      <span className="text-surface-900 dark:text-surface-100">
                        {app.domain.name}
                      </span>
                    </div>
                  )}
                  {app.framework && (
                    <div className="flex justify-between">
                      <span>Framework</span>
                      <span className="text-surface-900 dark:text-surface-100">
                        {app.framework}
                      </span>
                    </div>
                  )}
                  {app.port && (
                    <div className="flex justify-between">
                      <span>Port</span>
                      <span className="text-surface-900 dark:text-surface-100">
                        {app.port}
                      </span>
                    </div>
                  )}
                  {app.processInfo && (
                    <div className="flex justify-between">
                      <span>Memory</span>
                      <span className="text-surface-900 dark:text-surface-100">
                        {Math.round(app.processInfo.memory / 1024 / 1024)} MB
                      </span>
                    </div>
                  )}
                </div>

                {/* Last Deploy */}
                {app.lastDeployedAt && (
                  <div className="mt-4 pt-4 border-t border-surface-100 dark:border-surface-800">
                    <p className="text-xs text-surface-500">
                      Last deployed:{' '}
                      {new Date(app.lastDeployedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Box className="w-12 h-12 mx-auto text-surface-300 dark:text-surface-600" />
              <h3 className="mt-4 text-lg font-medium text-surface-900 dark:text-surface-100">
                No applications found
              </h3>
              <p className="mt-2 text-surface-500 dark:text-surface-400">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Get started by creating your first application'}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-4"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Application
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Modal */}
      <AppCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Application"
      >
        <div className="space-y-4">
          <p className="text-surface-600 dark:text-surface-400">
            Are you sure you want to delete{' '}
            <span className="font-medium text-surface-900 dark:text-surface-100">
              {deleteConfirm?.name}
            </span>
            ? This will stop the application and remove all associated data.
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteApp.isPending}
            >
              Delete Application
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
