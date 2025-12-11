import { useState, useEffect } from 'react';
import { Button, Input, Modal, Alert, Select } from '@/components/ui';
import { useCreateDatabaseUser, useUpdateDatabaseUser } from '@/hooks';
import { getErrorMessage } from '@/lib/api';
import type { DatabaseUser, DatabasePrivilege } from '@/types';

interface DatabaseUserFormProps {
  databaseId: string;
  user?: DatabaseUser;
  isOpen: boolean;
  onClose: () => void;
}

const allPrivileges: DatabasePrivilege[] = [
  'ALL',
  'SELECT',
  'INSERT',
  'UPDATE',
  'DELETE',
  'CREATE',
  'DROP',
  'ALTER',
  'INDEX',
  'REFERENCES',
  'CREATE TEMPORARY TABLES',
  'LOCK TABLES',
  'EXECUTE',
  'CREATE VIEW',
  'SHOW VIEW',
  'CREATE ROUTINE',
  'ALTER ROUTINE',
  'EVENT',
  'TRIGGER',
];

const hostOptions = [
  { value: 'localhost', label: 'localhost (Local connections only)' },
  { value: '%', label: '% (Any host)' },
  { value: '127.0.0.1', label: '127.0.0.1 (Local IP)' },
];

export function DatabaseUserForm({
  databaseId,
  user,
  isOpen,
  onClose,
}: DatabaseUserFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [host, setHost] = useState('localhost');
  const [privileges, setPrivileges] = useState<DatabasePrivilege[]>(['ALL']);
  const [canGrant, setCanGrant] = useState(false);
  const [maxConnections, setMaxConnections] = useState(0);
  const [maxQueriesPerHour, setMaxQueriesPerHour] = useState(0);
  const [maxUpdatesPerHour, setMaxUpdatesPerHour] = useState(0);
  const [maxConnectionsPerHour, setMaxConnectionsPerHour] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const createUser = useCreateDatabaseUser();
  const updateUser = useUpdateDatabaseUser();
  const isEditing = !!user;

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setHost(user.host);
      setPrivileges(user.privileges);
      setCanGrant(user.canGrant);
      setMaxConnections(user.maxConnections);
      setMaxQueriesPerHour(user.maxQueriesPerHour);
      setMaxUpdatesPerHour(user.maxUpdatesPerHour);
      setMaxConnectionsPerHour(user.maxConnectionsPerHour);
    } else {
      resetForm();
    }
  }, [user]);

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setHost('localhost');
    setPrivileges(['ALL']);
    setCanGrant(false);
    setMaxConnections(0);
    setMaxQueriesPerHour(0);
    setMaxUpdatesPerHour(0);
    setMaxConnectionsPerHour(0);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (isEditing) {
        await updateUser.mutateAsync({
          databaseId,
          userId: user.id,
          data: {
            password: password || undefined,
            privileges,
            canGrant,
            maxConnections,
            maxQueriesPerHour,
            maxUpdatesPerHour,
            maxConnectionsPerHour,
          },
        });
      } else {
        await createUser.mutateAsync({
          databaseId,
          data: {
            username,
            password,
            host,
            privileges,
            canGrant,
            maxConnections,
            maxQueriesPerHour,
            maxUpdatesPerHour,
            maxConnectionsPerHour,
          },
        });
      }
      handleClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const togglePrivilege = (priv: DatabasePrivilege) => {
    if (priv === 'ALL') {
      if (privileges.includes('ALL')) {
        setPrivileges([]);
      } else {
        setPrivileges(['ALL']);
      }
    } else {
      setPrivileges((prev) => {
        const newPrivs = prev.filter((p) => p !== 'ALL');
        if (newPrivs.includes(priv)) {
          return newPrivs.filter((p) => p !== priv);
        }
        return [...newPrivs, priv];
      });
    }
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < 16; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
  };

  const isPending = createUser.isPending || updateUser.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit User' : 'Add Database User'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Username
            </label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="db_user"
              required={!isEditing}
              disabled={isEditing}
              pattern="^[a-z][a-z0-9_]*$"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Host
            </label>
            <Select
              value={host}
              onChange={(e) => setHost(e.target.value)}
              disabled={isEditing}
            >
              {hostOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Password {isEditing && '(leave empty to keep current)'}
          </label>
          <div className="flex gap-2">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Strong password"
              required={!isEditing}
              minLength={8}
              className="flex-1"
            />
            <Button type="button" variant="secondary" onClick={generatePassword}>
              Generate
            </Button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
            Privileges
          </label>
          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border border-surface-200 dark:border-surface-700 rounded-lg">
            {allPrivileges.map((priv) => (
              <label
                key={priv}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={privileges.includes(priv) || (priv !== 'ALL' && privileges.includes('ALL'))}
                  onChange={() => togglePrivilege(priv)}
                  disabled={priv !== 'ALL' && privileges.includes('ALL')}
                  className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-surface-700 dark:text-surface-300">{priv}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={canGrant}
              onChange={(e) => setCanGrant(e.target.checked)}
              className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
              Grant Option (can grant privileges to others)
            </span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Max Connections (0 = unlimited)
            </label>
            <Input
              type="number"
              value={maxConnections}
              onChange={(e) => setMaxConnections(parseInt(e.target.value) || 0)}
              min={0}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Max Queries/Hour (0 = unlimited)
            </label>
            <Input
              type="number"
              value={maxQueriesPerHour}
              onChange={(e) => setMaxQueriesPerHour(parseInt(e.target.value) || 0)}
              min={0}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Max Updates/Hour (0 = unlimited)
            </label>
            <Input
              type="number"
              value={maxUpdatesPerHour}
              onChange={(e) => setMaxUpdatesPerHour(parseInt(e.target.value) || 0)}
              min={0}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Max Connections/Hour (0 = unlimited)
            </label>
            <Input
              type="number"
              value={maxConnectionsPerHour}
              onChange={(e) => setMaxConnectionsPerHour(parseInt(e.target.value) || 0)}
              min={0}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isPending}>
            {isEditing ? 'Update User' : 'Create User'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
