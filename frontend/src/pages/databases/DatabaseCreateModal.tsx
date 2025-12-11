import { useState } from 'react';
import { Button, Input, Modal, Alert, Select } from '@/components/ui';
import { useCreateDatabase } from '@/hooks';
import { getErrorMessage } from '@/lib/api';
import type { DatabaseType } from '@/types';

interface DatabaseCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const databaseTypes: { value: DatabaseType; label: string }[] = [
  { value: 'MARIADB', label: 'MariaDB' },
  { value: 'MYSQL', label: 'MySQL' },
];

const charsets = [
  { value: 'utf8mb4', label: 'utf8mb4 (Recommended)' },
  { value: 'utf8', label: 'utf8' },
  { value: 'latin1', label: 'latin1' },
];

const collations = [
  { value: 'utf8mb4_unicode_ci', label: 'utf8mb4_unicode_ci (Recommended)' },
  { value: 'utf8mb4_general_ci', label: 'utf8mb4_general_ci' },
  { value: 'utf8_general_ci', label: 'utf8_general_ci' },
  { value: 'latin1_swedish_ci', label: 'latin1_swedish_ci' },
];

export function DatabaseCreateModal({ isOpen, onClose }: DatabaseCreateModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<DatabaseType>('MARIADB');
  const [charset, setCharset] = useState('utf8mb4');
  const [collation, setCollation] = useState('utf8mb4_unicode_ci');
  const [description, setDescription] = useState('');
  const [createUser, setCreateUser] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createDatabase = useCreateDatabase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await createDatabase.mutateAsync({
        name,
        type,
        charset,
        collation,
        description: description || undefined,
        initialUsername: createUser ? username : undefined,
        initialPassword: createUser ? password : undefined,
      });
      handleClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleClose = () => {
    setName('');
    setType('MARIADB');
    setCharset('utf8mb4');
    setCollation('utf8mb4_unicode_ci');
    setDescription('');
    setCreateUser(true);
    setUsername('');
    setPassword('');
    setError(null);
    onClose();
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < 16; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Database">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Database Name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value.toLowerCase())}
            placeholder="my_database"
            required
            pattern="^[a-z][a-z0-9_]*$"
            title="Must start with a letter and contain only lowercase letters, numbers, and underscores"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Database Type
            </label>
            <Select
              value={type}
              onChange={(e) => setType(e.target.value as DatabaseType)}
            >
              {databaseTypes.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Character Set
            </label>
            <Select
              value={charset}
              onChange={(e) => setCharset(e.target.value)}
            >
              {charsets.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Collation
          </label>
          <Select
            value={collation}
            onChange={(e) => setCollation(e.target.value)}
          >
            {collations.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Description (optional)
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description of this database"
          />
        </div>

        <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={createUser}
              onChange={(e) => setCreateUser(e.target.checked)}
              className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
              Create initial database user
            </span>
          </label>
        </div>

        {createUser && (
          <div className="space-y-4 pl-6">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Username
              </label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="db_user"
                required={createUser}
                pattern="^[a-z][a-z0-9_]*$"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Password
              </label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Strong password"
                  required={createUser}
                  minLength={8}
                  className="flex-1"
                />
                <Button type="button" variant="secondary" onClick={generatePassword}>
                  Generate
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={createDatabase.isPending}>
            Create Database
          </Button>
        </div>
      </form>
    </Modal>
  );
}
