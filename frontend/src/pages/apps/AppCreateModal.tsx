import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Button,
  Input,
  Select,
  Modal,
  Alert,
} from '@/components/ui';
import { useCreateApp, useDomains } from '@/hooks';
import { getErrorMessage } from '@/lib/api';
import type { CreateAppDto, AppType } from '@/types';

interface AppCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  domainId?: string;
}

const appTypes = [
  { value: 'NODEJS', label: 'Node.js' },
  { value: 'PHP', label: 'PHP' },
  { value: 'STATIC', label: 'Static' },
];

const nodeFrameworks = [
  { value: 'EXPRESS', label: 'Express' },
  { value: 'NESTJS', label: 'NestJS' },
  { value: 'NEXTJS', label: 'Next.js' },
  { value: 'NUXT', label: 'Nuxt' },
  { value: 'FASTIFY', label: 'Fastify' },
  { value: 'OTHER', label: 'Other' },
];

const phpFrameworks = [
  { value: 'LARAVEL', label: 'Laravel' },
  { value: 'SYMFONY', label: 'Symfony' },
  { value: 'WORDPRESS', label: 'WordPress' },
  { value: 'DRUPAL', label: 'Drupal' },
  { value: 'CUSTOM', label: 'Custom' },
];

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

export function AppCreateModal({ isOpen, onClose, domainId }: AppCreateModalProps) {
  const [error, setError] = useState<string | null>(null);
  const createApp = useCreateApp();
  const { data: domains } = useDomains();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateAppDto>({
    defaultValues: {
      type: 'NODEJS',
      autoDeploy: false,
      domainId: domainId || '',
    },
  });

  const selectedType = watch('type') as AppType;

  const onSubmit = async (data: CreateAppDto) => {
    setError(null);
    try {
      await createApp.mutateAsync(data);
      reset();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleClose = () => {
    reset();
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Application" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Application Name"
            placeholder="my-app"
            error={errors.name?.message}
            {...register('name', {
              required: 'Name is required',
              pattern: {
                value: /^[a-z][a-z0-9-]*$/,
                message: 'Must start with a letter and contain only lowercase letters, numbers, and dashes',
              },
            })}
          />

          <Select
            label="Domain"
            error={errors.domainId?.message}
            {...register('domainId', { required: 'Domain is required' })}
          >
            <option value="">Select a domain</option>
            {domains?.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Application Type"
            {...register('type', { required: 'Type is required' })}
          >
            {appTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>

          {selectedType === 'NODEJS' && (
            <Select label="Framework" {...register('framework')}>
              <option value="">Select a framework</option>
              {nodeFrameworks.map((fw) => (
                <option key={fw.value} value={fw.value}>
                  {fw.label}
                </option>
              ))}
            </Select>
          )}

          {selectedType === 'PHP' && (
            <Select label="Framework" {...register('framework')}>
              <option value="">Select a framework</option>
              {phpFrameworks.map((fw) => (
                <option key={fw.value} value={fw.value}>
                  {fw.label}
                </option>
              ))}
            </Select>
          )}
        </div>

        {selectedType === 'NODEJS' && (
          <div className="grid grid-cols-2 gap-4">
            <Select label="Node.js Version" {...register('nodeVersion')}>
              {nodeVersions.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </Select>

            <Input
              label="Entry Point"
              placeholder="index.js or dist/main.js"
              {...register('entryPoint')}
            />
          </div>
        )}

        {selectedType === 'PHP' && (
          <div className="grid grid-cols-2 gap-4">
            <Select label="PHP Version" {...register('phpVersion')}>
              {phpVersions.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </Select>

            <Input
              label="Entry Point"
              placeholder="index.php or public/index.php"
              {...register('entryPoint')}
            />
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-surface-700 dark:text-surface-300">
            Git Repository (Optional)
          </h3>
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
        </div>

        {selectedType === 'NODEJS' && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-surface-700 dark:text-surface-300">
              Build Commands (Optional)
            </h3>
            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <Input
              label="Start Command"
              placeholder="npm start"
              {...register('startCommand')}
            />
          </div>
        )}

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

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={createApp.isPending}>
            Create Application
          </Button>
        </div>
      </form>
    </Modal>
  );
}
