import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Database as DatabaseIcon,
  Plus,
  Search,
  MoreVertical,
  Trash2,
  RefreshCw,
  Users,
  HardDrive,
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
import { useDatabases, useDeleteDatabase, useRefreshDatabaseStats } from '@/hooks';
import type { Database, DatabaseStatus } from '@/types';
import { DatabaseCreateModal } from './DatabaseCreateModal';

const statusColors: Record<DatabaseStatus, 'success' | 'warning' | 'danger' | 'default'> = {
  ACTIVE: 'success',
  CREATING: 'warning',
  ERROR: 'danger',
  SUSPENDED: 'default',
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function DatabasesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Database | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  const { data: databases, isLoading, error } = useDatabases();
  const deleteDatabase = useDeleteDatabase();
  const refreshStats = useRefreshDatabaseStats();

  const filteredDatabases = databases?.filter((db) =>
    db.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteDatabase.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleRefresh = async (db: Database) => {
    await refreshStats.mutateAsync(db.id);
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
        Failed to load databases. Please try again later.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
            Databases
          </h1>
          <p className="text-surface-600 dark:text-surface-400 mt-1">
            Manage your MariaDB/MySQL databases
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Database
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <Input
          placeholder="Search databases..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Databases Grid */}
      {filteredDatabases && filteredDatabases.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDatabases.map((db) => (
            <Card key={db.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <DatabaseIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <Link
                        to={`/databases/${db.id}`}
                        className="font-medium text-surface-900 dark:text-surface-100 hover:text-primary-600 dark:hover:text-primary-400"
                      >
                        {db.name}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={statusColors[db.status]} size="sm">
                          {db.status}
                        </Badge>
                        <span className="text-xs text-surface-500">{db.type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() =>
                        setActionMenuOpen(actionMenuOpen === db.id ? null : db.id)
                      }
                      className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {actionMenuOpen === db.id && (
                      <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 py-1 z-10">
                        <button
                          onClick={() => handleRefresh(db)}
                          className="w-full px-4 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                        >
                          <RefreshCw className="w-4 h-4" /> Refresh Stats
                        </button>
                        <Link
                          to={`/databases/${db.id}?tab=users`}
                          className="w-full px-4 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                        >
                          <Users className="w-4 h-4" /> Manage Users
                        </Link>
                        <hr className="my-1 border-surface-200 dark:border-surface-700" />
                        <button
                          onClick={() => {
                            setDeleteConfirm(db);
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

                {/* Database Details */}
                <div className="mt-4 space-y-2 text-sm text-surface-600 dark:text-surface-400">
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-4 h-4" /> Size
                    </span>
                    <span className="text-surface-900 dark:text-surface-100">
                      {formatBytes(db.sizeBytes)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tables</span>
                    <span className="text-surface-900 dark:text-surface-100">
                      {db.tableCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Users</span>
                    <span className="text-surface-900 dark:text-surface-100">
                      {db.users?.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Charset</span>
                    <span className="text-surface-900 dark:text-surface-100">
                      {db.charset}
                    </span>
                  </div>
                </div>

                {/* Last Backup */}
                {db.lastBackupAt && (
                  <div className="mt-4 pt-4 border-t border-surface-100 dark:border-surface-800">
                    <p className="text-xs text-surface-500">
                      Last backup: {new Date(db.lastBackupAt).toLocaleDateString()}
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
              <DatabaseIcon className="w-12 h-12 mx-auto text-surface-300 dark:text-surface-600" />
              <h3 className="mt-4 text-lg font-medium text-surface-900 dark:text-surface-100">
                No databases found
              </h3>
              <p className="mt-2 text-surface-500 dark:text-surface-400">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Get started by creating your first database'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsCreateModalOpen(true)} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  New Database
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Modal */}
      <DatabaseCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Database"
      >
        <div className="space-y-4">
          <p className="text-surface-600 dark:text-surface-400">
            Are you sure you want to delete{' '}
            <span className="font-medium text-surface-900 dark:text-surface-100">
              {deleteConfirm?.name}
            </span>
            ? This will delete all data, tables, and associated users. This action cannot
            be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteDatabase.isPending}
            >
              Delete Database
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
