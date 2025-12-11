import { useState } from 'react';
import {
  Download,
  Upload,
  FileText,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  Input,
  Alert,
  Modal,
} from '@/components/ui';
import { useBackupDatabase, useRestoreDatabase, useImportSQL } from '@/hooks';
import { getErrorMessage } from '@/lib/api';
import type { Database } from '@/types';

interface DatabaseBackupTabProps {
  database: Database;
}

export function DatabaseBackupTab({ database }: DatabaseBackupTabProps) {
  const [backupPath, setBackupPath] = useState(`/home/backups/${database.name}_backup.sql`);
  const [restorePath, setRestorePath] = useState('');
  const [sqlContent, setSqlContent] = useState('');
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const backupDatabase = useBackupDatabase();
  const restoreDatabase = useRestoreDatabase();
  const importSQL = useImportSQL();

  const handleBackup = async () => {
    setError(null);
    setSuccess(null);
    try {
      await backupDatabase.mutateAsync({
        id: database.id,
        outputPath: backupPath,
      });
      setSuccess(`Backup created successfully at ${backupPath}`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleRestore = async () => {
    setError(null);
    setSuccess(null);
    try {
      await restoreDatabase.mutateAsync({
        id: database.id,
        inputPath: restorePath,
      });
      setSuccess('Database restored successfully');
      setIsRestoreModalOpen(false);
      setRestorePath('');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleImportSQL = async () => {
    setError(null);
    setSuccess(null);
    try {
      await importSQL.mutateAsync({
        id: database.id,
        sql: sqlContent,
      });
      setSuccess('SQL imported successfully');
      setIsImportModalOpen(false);
      setSqlContent('');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Backup Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Download className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-surface-900 dark:text-surface-100">
                Create Backup
              </h3>
              <p className="text-sm text-surface-500 mt-1">
                Export your database to a SQL file for safekeeping or migration.
              </p>

              <div className="mt-4 flex gap-4">
                <Input
                  value={backupPath}
                  onChange={(e) => setBackupPath(e.target.value)}
                  placeholder="/path/to/backup.sql"
                  className="flex-1"
                />
                <Button
                  onClick={handleBackup}
                  isLoading={backupDatabase.isPending}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Create Backup
                </Button>
              </div>

              {database.lastBackupAt && (
                <div className="mt-3 flex items-center gap-2 text-sm text-surface-500">
                  <Clock className="w-4 h-4" />
                  Last backup: {new Date(database.lastBackupAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Restore Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Upload className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-surface-900 dark:text-surface-100">
                Restore from Backup
              </h3>
              <p className="text-sm text-surface-500 mt-1">
                Restore your database from a SQL backup file. This will overwrite existing data.
              </p>

              <div className="mt-4">
                <Button
                  variant="secondary"
                  onClick={() => setIsRestoreModalOpen(true)}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Restore Database
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import SQL Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-surface-900 dark:text-surface-100">
                Import SQL
              </h3>
              <p className="text-sm text-surface-500 mt-1">
                Execute SQL statements directly on your database.
              </p>

              <div className="mt-4">
                <Button
                  variant="secondary"
                  onClick={() => setIsImportModalOpen(true)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Import SQL
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Restore Modal */}
      <Modal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        title="Restore Database"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-orange-800 dark:text-orange-200">
              <p className="font-medium">Warning</p>
              <p className="mt-1">
                Restoring from a backup will overwrite all existing data in this database.
                Make sure you have a current backup before proceeding.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Backup File Path
            </label>
            <Input
              value={restorePath}
              onChange={(e) => setRestorePath(e.target.value)}
              placeholder="/path/to/backup.sql"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setIsRestoreModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleRestore}
              isLoading={restoreDatabase.isPending}
              disabled={!restorePath}
            >
              Restore Database
            </Button>
          </div>
        </div>
      </Modal>

      {/* Import SQL Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import SQL"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              SQL Statements
            </label>
            <textarea
              value={sqlContent}
              onChange={(e) => setSqlContent(e.target.value)}
              placeholder="Enter SQL statements here..."
              rows={10}
              className="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setIsImportModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportSQL}
              isLoading={importSQL.isPending}
              disabled={!sqlContent.trim()}
            >
              Execute SQL
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
