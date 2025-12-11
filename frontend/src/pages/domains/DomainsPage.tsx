import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe,
  Plus,
  Search,
  MoreVertical,
  Play,
  Pause,
  Trash2,
  ExternalLink,
  Settings,
} from 'lucide-react';
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
import { useDomains, useDeleteDomain, useSuspendDomain, useUnsuspendDomain } from '@/hooks';
import type { Domain, DomainStatus } from '@/types';
import { DomainCreateModal } from './DomainCreateModal';

const statusColors: Record<DomainStatus, 'success' | 'warning' | 'danger' | 'default'> = {
  ACTIVE: 'success',
  PENDING: 'warning',
  SUSPENDED: 'danger',
  ERROR: 'danger',
};

export function DomainsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Domain | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  const { data: domains, isLoading, error } = useDomains();
  const deleteDomain = useDeleteDomain();
  const suspendDomain = useSuspendDomain();
  const unsuspendDomain = useUnsuspendDomain();

  const filteredDomains = domains?.filter((domain) =>
    domain.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteDomain.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);
    } catch (err) {
      // Error handled by mutation
    }
  };

  const handleSuspend = async (domain: Domain) => {
    if (domain.status === 'SUSPENDED') {
      await unsuspendDomain.mutateAsync(domain.id);
    } else {
      await suspendDomain.mutateAsync(domain.id);
    }
    setActionMenuOpen(null);
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
        Failed to load domains. Please try again later.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
            Domains
          </h1>
          <p className="text-surface-600 dark:text-surface-400 mt-1">
            Manage your websites and domains
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Domain
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <Input
          placeholder="Search domains..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Domains Grid */}
      {filteredDomains && filteredDomains.length > 0 ? (
        <div className="grid gap-4">
          {filteredDomains.map((domain) => (
            <Card key={domain.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/domains/${domain.id}`}
                          className="font-medium text-surface-900 dark:text-surface-100 hover:text-primary-600 dark:hover:text-primary-400"
                        >
                          {domain.name}
                        </Link>
                        <Badge variant={statusColors[domain.status]}>
                          {domain.status}
                        </Badge>
                        {domain.sslEnabled && (
                          <Badge variant="success">SSL</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-surface-500 dark:text-surface-400 mt-1">
                        <span>{domain.runtimeType}</span>
                        {domain.phpVersion && <span>PHP {domain.phpVersion}</span>}
                        {domain.nodeVersion && <span>Node {domain.nodeVersion}</span>}
                        <span>{domain.diskUsageMb} MB used</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`https://${domain.name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <Link
                      to={`/domains/${domain.id}`}
                      className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"
                    >
                      <Settings className="w-4 h-4" />
                    </Link>
                    <div className="relative">
                      <button
                        onClick={() =>
                          setActionMenuOpen(
                            actionMenuOpen === domain.id ? null : domain.id
                          )
                        }
                        className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {actionMenuOpen === domain.id && (
                        <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 py-1 z-10">
                          <button
                            onClick={() => handleSuspend(domain)}
                            className="w-full px-4 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                          >
                            {domain.status === 'SUSPENDED' ? (
                              <>
                                <Play className="w-4 h-4" /> Unsuspend
                              </>
                            ) : (
                              <>
                                <Pause className="w-4 h-4" /> Suspend
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setDeleteConfirm(domain);
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
              <Globe className="w-12 h-12 mx-auto text-surface-300 dark:text-surface-600" />
              <h3 className="mt-4 text-lg font-medium text-surface-900 dark:text-surface-100">
                No domains found
              </h3>
              <p className="mt-2 text-surface-500 dark:text-surface-400">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Get started by adding your first domain'}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-4"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Domain
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Modal */}
      <DomainCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Domain"
      >
        <div className="space-y-4">
          <p className="text-surface-600 dark:text-surface-400">
            Are you sure you want to delete{' '}
            <span className="font-medium text-surface-900 dark:text-surface-100">
              {deleteConfirm?.name}
            </span>
            ? This will also delete all associated files, databases, and email
            accounts. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
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
