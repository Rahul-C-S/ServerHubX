import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Globe,
  ArrowLeft,
  Settings,
  Lock,
  Unlock,
  HardDrive,
  Activity,
  FolderTree,
  Terminal,
  Database,
  Mail,
  Shield,
  Trash2,
} from 'lucide-react';
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
  Alert,
  Modal,
} from '@/components/ui';
import {
  useDomain,
  useDomainStats,
  useUpdateDomain,
  useDeleteDomain,
  useSuspendDomain,
  useUnsuspendDomain,
} from '@/hooks';
import type { DomainStatus } from '@/types';

const statusColors: Record<DomainStatus, 'success' | 'warning' | 'danger' | 'default'> = {
  ACTIVE: 'success',
  PENDING: 'warning',
  SUSPENDED: 'danger',
  ERROR: 'danger',
};

export function DomainDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [_isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { data: domain, isLoading, error } = useDomain(id!);
  const { data: stats } = useDomainStats(id!);
  const updateDomain = useUpdateDomain();
  const deleteDomain = useDeleteDomain();
  const suspendDomain = useSuspendDomain();
  const unsuspendDomain = useUnsuspendDomain();

  const handleToggleSuspend = async () => {
    if (!domain) return;
    if (domain.status === 'SUSPENDED') {
      await unsuspendDomain.mutateAsync(domain.id);
    } else {
      await suspendDomain.mutateAsync(domain.id);
    }
  };

  const handleToggleSSL = async () => {
    if (!domain) return;
    await updateDomain.mutateAsync({
      id: domain.id,
      data: { forceHttps: !domain.forceHttps },
    });
  };

  const handleDelete = async () => {
    if (!domain) return;
    await deleteDomain.mutateAsync(domain.id);
    navigate('/domains');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !domain) {
    return (
      <Alert variant="error">
        Failed to load domain details. The domain may not exist.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/domains"
            className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <Globe className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
                {domain.name}
              </h1>
              <Badge variant={statusColors[domain.status]}>{domain.status}</Badge>
            </div>
            <p className="text-surface-500 dark:text-surface-400">
              {domain.runtimeType} {domain.phpVersion && `${domain.phpVersion}`}
              {domain.nodeVersion && ` v${domain.nodeVersion}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleToggleSuspend}
            isLoading={suspendDomain.isPending || unsuspendDomain.isPending}
          >
            {domain.status === 'SUSPENDED' ? (
              <>
                <Unlock className="w-4 h-4 mr-2" /> Unsuspend
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" /> Suspend
              </>
            )}
          </Button>
          <Button variant="secondary" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="w-4 h-4 mr-2" /> Settings
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  Disk Usage
                </p>
                <p className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                  {stats?.diskUsageMb || 0} MB
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  Bandwidth
                </p>
                <p className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                  {stats?.bandwidthUsedMb || 0} MB
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <FolderTree className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  Subdomains
                </p>
                <p className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                  {stats?.subdomainCount || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Shield className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  SSL
                </p>
                <p className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                  {domain.sslEnabled ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover:border-primary-300 dark:hover:border-primary-600 cursor-pointer transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <FolderTree className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <span className="font-medium text-surface-900 dark:text-surface-100">
              File Manager
            </span>
          </CardContent>
        </Card>
        <Card className="hover:border-primary-300 dark:hover:border-primary-600 cursor-pointer transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <Terminal className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <span className="font-medium text-surface-900 dark:text-surface-100">
              Terminal
            </span>
          </CardContent>
        </Card>
        <Card className="hover:border-primary-300 dark:hover:border-primary-600 cursor-pointer transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <Database className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <span className="font-medium text-surface-900 dark:text-surface-100">
              Databases
            </span>
          </CardContent>
        </Card>
        <Card className="hover:border-primary-300 dark:hover:border-primary-600 cursor-pointer transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <Mail className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <span className="font-medium text-surface-900 dark:text-surface-100">
              Email Accounts
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Domain Info */}
      <Card>
        <CardHeader>
          <CardTitle>Domain Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-surface-500 dark:text-surface-400">
                Document Root
              </dt>
              <dd className="text-surface-900 dark:text-surface-100 font-mono text-sm">
                {domain.documentRoot}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-surface-500 dark:text-surface-400">
                Web Server
              </dt>
              <dd className="text-surface-900 dark:text-surface-100">
                {domain.webServer}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-surface-500 dark:text-surface-400">
                System User
              </dt>
              <dd className="text-surface-900 dark:text-surface-100 font-mono text-sm">
                {domain.systemUser?.username || 'N/A'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-surface-500 dark:text-surface-400">
                Force HTTPS
              </dt>
              <dd>
                <button
                  onClick={handleToggleSSL}
                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                    domain.forceHttps
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400'
                  }`}
                >
                  {domain.forceHttps ? 'Enabled' : 'Disabled'}
                </button>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-surface-500 dark:text-surface-400">
                WWW Redirect
              </dt>
              <dd className="text-surface-900 dark:text-surface-100">
                {domain.wwwRedirect ? 'Yes' : 'No'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-surface-500 dark:text-surface-400">
                Created
              </dt>
              <dd className="text-surface-900 dark:text-surface-100">
                {new Date(domain.createdAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-surface-900 dark:text-surface-100">
                Delete this domain
              </p>
              <p className="text-sm text-surface-500 dark:text-surface-400">
                Once deleted, all files, databases, and emails will be permanently removed.
              </p>
            </div>
            <Button variant="danger" onClick={() => setIsDeleteModalOpen(true)}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete Domain
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Domain"
      >
        <div className="space-y-4">
          <p className="text-surface-600 dark:text-surface-400">
            Are you sure you want to delete{' '}
            <span className="font-medium text-surface-900 dark:text-surface-100">
              {domain.name}
            </span>
            ? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteDomain.isPending}
            >
              Delete Domain
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
