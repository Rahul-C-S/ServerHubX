import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Button,
  Input,
  Select,
  Card,
  CardContent,
  CardHeader,
  Alert,
} from '@/components/ui';
import { useUpdateApp } from '@/hooks';
import { getErrorMessage } from '@/lib/api';
import type { App, UpdateAppDto } from '@/types';

interface AppSettingsTabProps {
  app: App;
}

const nodeVersions = [
  { value: '24', label: 'Node.js 24 (Latest)' },
  { value: '22', label: 'Node.js 22 (LTS)' },
  { value: '20', label: 'Node.js 20 (LTS)' },
  { value: '18', label: 'Node.js 18' },
];

const phpVersions = [
  { value: '8.3', label: 'PHP 8.3 (Latest)' },
  { value: '8.2', label: 'PHP 8.2' },
  { value: '8.1', label: 'PHP 8.1' },
  { value: '8.0', label: 'PHP 8.0' },
  { value: '7.4', label: 'PHP 7.4' },
];

export function AppSettingsTab({ app }: AppSettingsTabProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const updateApp = useUpdateApp();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<UpdateAppDto>({
    defaultValues: {
      name: app.name,
      path: app.path,
      entryPoint: app.entryPoint,
      port: app.port,
      gitRepository: app.gitRepository,
      gitBranch: app.gitBranch,
      buildCommand: app.buildCommand,
      installCommand: app.installCommand,
      startCommand: app.startCommand,
      autoDeploy: app.autoDeploy,
      nodeVersion: app.nodeVersion,
      phpVersion: app.phpVersion,
    },
  });

  const onSubmit = async (data: UpdateAppDto) => {
    setError(null);
    setSuccess(false);
    try {
      await updateApp.mutateAsync({ id: app.id, dto: data });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const isNodeApp = app.type === 'NODEJS';
  const isPhpApp = app.type === 'PHP';

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" onClose={() => setSuccess(false)}>
          Application settings updated successfully!
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium">General Settings</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Application Name"
                error={errors.name?.message}
                {...register('name', {
                  pattern: {
                    value: /^[a-z][a-z0-9-]*$/,
                    message: 'Invalid name format',
                  },
                })}
              />

              <Input
                label="Application Path"
                {...register('path')}
                disabled
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Entry Point"
                placeholder={isNodeApp ? 'index.js' : 'index.php'}
                {...register('entryPoint')}
              />

              {isNodeApp && (
                <Input
                  label="Port"
                  type="number"
                  {...register('port', { valueAsNumber: true })}
                />
              )}
            </div>

            {isNodeApp && (
              <Select label="Node.js Version" {...register('nodeVersion')}>
                {nodeVersions.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </Select>
            )}

            {isPhpApp && (
              <Select label="PHP Version" {...register('phpVersion')}>
                {phpVersions.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </Select>
            )}
          </CardContent>
        </Card>

        {/* Git Settings */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium">Git Repository</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Repository URL"
                placeholder="https://github.com/user/repo.git"
                {...register('gitRepository')}
              />

              <Input
                label="Branch"
                placeholder="main"
                {...register('gitBranch')}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoDeploy"
                {...register('autoDeploy')}
                className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
              />
              <label
                htmlFor="autoDeploy"
                className="text-sm text-surface-700 dark:text-surface-300"
              >
                Enable auto-deploy on git push
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Build Settings (Node.js only) */}
        {isNodeApp && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-medium">Build Configuration</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Install Command"
                placeholder="npm install"
                {...register('installCommand')}
              />

              <Input
                label="Build Command"
                placeholder="npm run build"
                {...register('buildCommand')}
              />

              <Input
                label="Start Command"
                placeholder="npm start"
                {...register('startCommand')}
              />
            </CardContent>
          </Card>
        )}

        {/* PM2 Configuration (Node.js only) */}
        {isNodeApp && app.pm2Config && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-medium">PM2 Configuration</h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-surface-500">Instances</p>
                  <p className="text-surface-900 dark:text-surface-100">
                    {app.pm2Config.instances || 1}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-surface-500">Exec Mode</p>
                  <p className="text-surface-900 dark:text-surface-100">
                    {app.pm2Config.exec_mode || 'fork'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-surface-500">Max Memory Restart</p>
                  <p className="text-surface-900 dark:text-surface-100">
                    {app.pm2Config.max_memory_restart || '500M'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-surface-500">Watch Mode</p>
                  <p className="text-surface-900 dark:text-surface-100">
                    {app.pm2Config.watch ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end">
          <Button type="submit" isLoading={updateApp.isPending} disabled={!isDirty}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
