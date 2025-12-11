import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Modal, Button, Input, Alert } from '@/components/ui';
import { useCreateDomain } from '@/hooks';
import { getErrorMessage } from '@/lib/api';
import type { CreateDomainRequest, RuntimeType } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  name: string;
  runtimeType: RuntimeType;
  phpVersion: string;
  nodeVersion: string;
  wwwRedirect: boolean;
}

export function DomainCreateModal({ isOpen, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const createDomain = useCreateDomain();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: '',
      runtimeType: 'PHP',
      phpVersion: '8.2',
      nodeVersion: '20',
      wwwRedirect: true,
    },
  });

  const runtimeType = watch('runtimeType');

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      const request: CreateDomainRequest = {
        name: data.name.toLowerCase().trim(),
        runtimeType: data.runtimeType,
        wwwRedirect: data.wwwRedirect,
      };

      if (data.runtimeType === 'PHP') {
        request.phpVersion = data.phpVersion;
      } else if (data.runtimeType === 'NODEJS') {
        request.nodeVersion = data.nodeVersion;
      }

      await createDomain.mutateAsync(request);
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
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Domain">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Domain Name
          </label>
          <Input
            {...register('name', {
              required: 'Domain name is required',
              pattern: {
                value: /^[a-z0-9][a-z0-9.-]{2,251}[a-z0-9]$/i,
                message: 'Invalid domain name format',
              },
            })}
            placeholder="example.com"
            error={errors.name?.message}
          />
          <p className="mt-1 text-xs text-surface-500">
            Enter the domain without http:// or www
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Runtime Type
          </label>
          <select
            {...register('runtimeType')}
            className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="PHP">PHP</option>
            <option value="NODEJS">Node.js</option>
            <option value="STATIC">Static</option>
          </select>
        </div>

        {runtimeType === 'PHP' && (
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              PHP Version
            </label>
            <select
              {...register('phpVersion')}
              className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="8.3">PHP 8.3</option>
              <option value="8.2">PHP 8.2</option>
              <option value="8.1">PHP 8.1</option>
              <option value="8.0">PHP 8.0</option>
              <option value="7.4">PHP 7.4</option>
            </select>
          </div>
        )}

        {runtimeType === 'NODEJS' && (
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Node.js Version
            </label>
            <select
              {...register('nodeVersion')}
              className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="24">Node.js 24</option>
              <option value="22">Node.js 22 LTS</option>
              <option value="20">Node.js 20 LTS</option>
              <option value="18">Node.js 18 LTS</option>
            </select>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="wwwRedirect"
            {...register('wwwRedirect')}
            className="w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
          />
          <label
            htmlFor="wwwRedirect"
            className="text-sm text-surface-700 dark:text-surface-300"
          >
            Redirect www to non-www
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={createDomain.isPending}>
            Create Domain
          </Button>
        </div>
      </form>
    </Modal>
  );
}
