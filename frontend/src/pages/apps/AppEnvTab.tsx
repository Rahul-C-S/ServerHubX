import { useState } from 'react';
import { Plus, Trash2, Eye, EyeOff, Save } from 'lucide-react';
import {
  Button,
  Input,
  Card,
  CardContent,
  CardHeader,
  Spinner,
  Alert,
} from '@/components/ui';
import { useAppEnv, useSetAppEnv, useDeleteAppEnv } from '@/hooks';
import { getErrorMessage } from '@/lib/api';
import type { EnvVariable } from '@/types';

interface AppEnvTabProps {
  appId: string;
}

interface EnvRow extends EnvVariable {
  id?: string;
  isNew?: boolean;
  showValue?: boolean;
}

export function AppEnvTab({ appId }: AppEnvTabProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [envRows, setEnvRows] = useState<EnvRow[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: envVars, isLoading, refetch } = useAppEnv(appId);
  const setEnv = useSetAppEnv();
  const deleteEnv = useDeleteAppEnv();

  // Initialize rows when data loads
  useState(() => {
    if (envVars && envRows.length === 0) {
      setEnvRows(
        envVars.map((env) => ({
          id: env.id,
          key: env.key,
          value: env.value,
          isSecret: env.isSecret,
          showValue: false,
        }))
      );
    }
  });

  const handleAddRow = () => {
    setEnvRows([
      ...envRows,
      { key: '', value: '', isSecret: false, isNew: true, showValue: true },
    ]);
    setHasChanges(true);
  };

  const handleRemoveRow = (index: number) => {
    const row = envRows[index];
    if (row.isNew) {
      // Just remove from local state
      setEnvRows(envRows.filter((_, i) => i !== index));
    } else if (row.key) {
      // Mark for deletion
      setEnvRows(envRows.filter((_, i) => i !== index));
      setHasChanges(true);
    }
  };

  const handleUpdateRow = (index: number, field: keyof EnvRow, value: string | boolean) => {
    const newRows = [...envRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setEnvRows(newRows);
    setHasChanges(true);
  };

  const handleToggleVisibility = (index: number) => {
    const newRows = [...envRows];
    newRows[index] = { ...newRows[index], showValue: !newRows[index].showValue };
    setEnvRows(newRows);
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(false);

    try {
      // Find deleted keys
      const currentKeys = envRows.map((r) => r.key);
      const deletedKeys = envVars
        ?.filter((env) => !currentKeys.includes(env.key))
        .map((env) => env.key) || [];

      // Delete removed vars
      if (deletedKeys.length > 0) {
        await deleteEnv.mutateAsync({ appId, keys: deletedKeys });
      }

      // Set/update vars
      const varsToSet = envRows
        .filter((row) => row.key && row.value)
        .map((row) => ({
          key: row.key,
          value: row.value,
          isSecret: row.isSecret,
        }));

      if (varsToSet.length > 0) {
        await setEnv.mutateAsync({ appId, variables: varsToSet });
      }

      await refetch();
      setSuccess(true);
      setHasChanges(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleReset = () => {
    if (envVars) {
      setEnvRows(
        envVars.map((env) => ({
          id: env.id,
          key: env.key,
          value: env.value,
          isSecret: env.isSecret,
          showValue: false,
        }))
      );
      setHasChanges(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  // Initialize rows on first load
  if (envVars && envRows.length === 0 && !hasChanges) {
    setEnvRows(
      envVars.map((env) => ({
        id: env.id,
        key: env.key,
        value: env.value,
        isSecret: env.isSecret,
        showValue: false,
      }))
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Environment Variables</h3>
            <p className="text-sm text-surface-500 mt-1">
              Manage environment variables for your application. Secret values are encrypted.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Button variant="secondary" onClick={handleReset}>
                Reset
              </Button>
            )}
            <Button onClick={handleAddRow}>
              <Plus className="w-4 h-4 mr-2" />
              Add Variable
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" onClose={() => setSuccess(false)}>
            Environment variables saved successfully!
          </Alert>
        )}

        {envRows.length > 0 ? (
          <div className="space-y-3">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-surface-500 px-1">
              <div className="col-span-4">Key</div>
              <div className="col-span-5">Value</div>
              <div className="col-span-2">Secret</div>
              <div className="col-span-1"></div>
            </div>

            {/* Rows */}
            {envRows.map((row, index) => (
              <div key={row.id || index} className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-4">
                  <Input
                    value={row.key}
                    onChange={(e) => handleUpdateRow(index, 'key', e.target.value)}
                    placeholder="VARIABLE_NAME"
                    className="font-mono"
                  />
                </div>
                <div className="col-span-5">
                  <div className="relative">
                    <Input
                      type={row.showValue || row.isNew ? 'text' : 'password'}
                      value={row.value}
                      onChange={(e) => handleUpdateRow(index, 'value', e.target.value)}
                      placeholder="value"
                      className="font-mono pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(index)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                    >
                      {row.showValue ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={row.isSecret}
                      onChange={(e) => handleUpdateRow(index, 'isSecret', e.target.checked)}
                      className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-surface-600 dark:text-surface-400">
                      Secret
                    </span>
                  </label>
                </div>
                <div className="col-span-1">
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(index)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-surface-500">
            <p>No environment variables defined.</p>
            <p className="text-sm mt-1">Click "Add Variable" to create one.</p>
          </div>
        )}

        {hasChanges && (
          <div className="flex justify-end pt-4 border-t border-surface-200 dark:border-surface-700">
            <Button
              onClick={handleSave}
              isLoading={setEnv.isPending || deleteEnv.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
