import { useState } from 'react';
import { Plus, Trash2, Edit2, Key } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  Badge,
  Modal,
  Alert,
  Spinner,
} from '@/components/ui';
import { useDatabaseUsers, useDeleteDatabaseUser } from '@/hooks';
import type { DatabaseUser } from '@/types';
import { DatabaseUserForm } from './DatabaseUserForm';

interface DatabaseUsersTabProps {
  databaseId: string;
}

export function DatabaseUsersTab({ databaseId }: DatabaseUsersTabProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<DatabaseUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DatabaseUser | null>(null);

  const { data: users, isLoading, error } = useDatabaseUsers(databaseId);
  const deleteUser = useDeleteDatabaseUser();

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteUser.mutateAsync({
        databaseId,
        userId: deleteConfirm.id,
      });
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
    return (
      <Alert variant="error">
        Failed to load database users.
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-surface-900 dark:text-surface-100">
          Database Users
        </h3>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {users && users.length > 0 ? (
        <div className="space-y-3">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Key className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium text-surface-900 dark:text-surface-100">
                        {user.username}@{user.host}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {user.privileges.slice(0, 3).map((priv) => (
                          <Badge key={priv} variant="default" size="sm">
                            {priv}
                          </Badge>
                        ))}
                        {user.privileges.length > 3 && (
                          <Badge variant="default" size="sm">
                            +{user.privileges.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditUser(user)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirm(user)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-surface-500">Max Connections</span>
                    <p className="text-surface-900 dark:text-surface-100">
                      {user.maxConnections === 0 ? 'Unlimited' : user.maxConnections}
                    </p>
                  </div>
                  <div>
                    <span className="text-surface-500">Queries/Hour</span>
                    <p className="text-surface-900 dark:text-surface-100">
                      {user.maxQueriesPerHour === 0 ? 'Unlimited' : user.maxQueriesPerHour}
                    </p>
                  </div>
                  <div>
                    <span className="text-surface-500">Updates/Hour</span>
                    <p className="text-surface-900 dark:text-surface-100">
                      {user.maxUpdatesPerHour === 0 ? 'Unlimited' : user.maxUpdatesPerHour}
                    </p>
                  </div>
                  <div>
                    <span className="text-surface-500">Grant Option</span>
                    <p className="text-surface-900 dark:text-surface-100">
                      {user.canGrant ? 'Yes' : 'No'}
                    </p>
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
              <Key className="w-12 h-12 mx-auto text-surface-300 dark:text-surface-600" />
              <h3 className="mt-4 text-lg font-medium text-surface-900 dark:text-surface-100">
                No users found
              </h3>
              <p className="mt-2 text-surface-500 dark:text-surface-400">
                Create a database user to connect to this database.
              </p>
              <Button onClick={() => setIsCreateOpen(true)} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create User Modal */}
      <DatabaseUserForm
        databaseId={databaseId}
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      {/* Edit User Modal */}
      {editUser && (
        <DatabaseUserForm
          databaseId={databaseId}
          user={editUser}
          isOpen={!!editUser}
          onClose={() => setEditUser(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete User"
      >
        <div className="space-y-4">
          <p className="text-surface-600 dark:text-surface-400">
            Are you sure you want to delete user{' '}
            <span className="font-medium text-surface-900 dark:text-surface-100">
              {deleteConfirm?.username}
            </span>
            ? This will revoke all their database access.
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
