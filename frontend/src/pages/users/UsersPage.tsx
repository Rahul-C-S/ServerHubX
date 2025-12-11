import { useState } from 'react';
import { Users, Search, MoreVertical, Trash2, Key, Lock } from 'lucide-react';
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
import { useSystemUsers, useDeleteSystemUser } from '@/hooks';
import type { SystemUser } from '@/types';

const statusColors: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  ACTIVE: 'success',
  PENDING: 'warning',
  SUSPENDED: 'danger',
};

export function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<SystemUser | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  const { data: users, isLoading, error } = useSystemUsers();
  const deleteUser = useDeleteSystemUser();

  const filteredUsers = users?.filter((user) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteUser.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);
    } catch (err) {
      // Error handled by mutation
    }
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
        Failed to load users. Please try again later.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
            System Users
          </h1>
          <p className="text-surface-600 dark:text-surface-400 mt-1">
            Manage Linux system users for your domains
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users List */}
      {filteredUsers && filteredUsers.length > 0 ? (
        <div className="grid gap-4">
          {filteredUsers.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium font-mono text-surface-900 dark:text-surface-100">
                          {user.username}
                        </span>
                        <Badge variant={statusColors[user.status]}>
                          {user.status}
                        </Badge>
                        {user.sshEnabled && (
                          <Badge variant="default">SSH</Badge>
                        )}
                        {user.sftpOnly && (
                          <Badge variant="warning">SFTP Only</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-surface-500 dark:text-surface-400 mt-1">
                        <span>UID: {user.uid}</span>
                        <span>{user.homeDirectory}</span>
                        {user.diskQuotaMb > 0 && (
                          <span>
                            {user.diskUsedMb} / {user.diskQuotaMb} MB
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <button
                        onClick={() =>
                          setActionMenuOpen(
                            actionMenuOpen === user.id ? null : user.id
                          )
                        }
                        className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {actionMenuOpen === user.id && (
                        <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 py-1 z-10">
                          <button
                            className="w-full px-4 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                          >
                            <Lock className="w-4 h-4" /> Change Password
                          </button>
                          <button
                            className="w-full px-4 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                          >
                            <Key className="w-4 h-4" /> SSH Keys
                          </button>
                          <button
                            onClick={() => {
                              setDeleteConfirm(user);
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Users className="w-12 h-12 mx-auto text-surface-300 dark:text-surface-600" />
              <h3 className="mt-4 text-lg font-medium text-surface-900 dark:text-surface-100">
                No users found
              </h3>
              <p className="mt-2 text-surface-500 dark:text-surface-400">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'System users are created automatically when adding domains'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete System User"
      >
        <div className="space-y-4">
          <p className="text-surface-600 dark:text-surface-400">
            Are you sure you want to delete user{' '}
            <span className="font-medium font-mono text-surface-900 dark:text-surface-100">
              {deleteConfirm?.username}
            </span>
            ? This will also delete the home directory and all files. This
            action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteUser.isPending}
            >
              Delete User
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
