import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe,
  Plus,
  Search,
  MoreVertical,
  Trash2,
  AlertCircle,
  FileText,
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
import { useDnsZones, useDeleteDnsZone } from '@/hooks';
import type { DnsZone, ZoneStatus } from '@/types';
import { DnsZoneCreateModal } from './DnsZoneCreateModal';

const statusColors: Record<ZoneStatus, 'success' | 'warning' | 'danger' | 'default'> = {
  ACTIVE: 'success',
  PENDING: 'warning',
  ERROR: 'danger',
  DISABLED: 'default',
};

export function DnsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<DnsZone | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  const { data: zones, isLoading, error } = useDnsZones();
  const deleteZone = useDeleteDnsZone();

  const filteredZones = zones?.filter((zone) =>
    zone.zoneName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteZone.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);
    } catch {
      // Error handled by mutation
    }
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
        Failed to load DNS zones. Please try again later.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
            DNS Management
          </h1>
          <p className="text-surface-600 dark:text-surface-400 mt-1">
            Manage DNS zones and records
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Zone
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <Input
          placeholder="Search zones..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Zones Grid */}
      {filteredZones && filteredZones.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredZones.map((zone) => (
            <Card key={zone.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <Link
                        to={`/dns/${zone.id}`}
                        className="font-medium text-surface-900 dark:text-surface-100 hover:text-primary-600 dark:hover:text-primary-400"
                      >
                        {zone.zoneName}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={statusColors[zone.status]} size="sm">
                          {zone.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() =>
                        setActionMenuOpen(actionMenuOpen === zone.id ? null : zone.id)
                      }
                      className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {actionMenuOpen === zone.id && (
                      <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 py-1 z-10">
                        <Link
                          to={`/dns/${zone.id}`}
                          className="w-full px-4 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4" /> Manage Records
                        </Link>
                        <hr className="my-1 border-surface-200 dark:border-surface-700" />
                        <button
                          onClick={() => {
                            setDeleteConfirm(zone);
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

                {/* Zone Details */}
                <div className="mt-4 space-y-2 text-sm text-surface-600 dark:text-surface-400">
                  <div className="flex justify-between">
                    <span>Records</span>
                    <span className="text-surface-900 dark:text-surface-100">
                      {zone.records?.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>TTL</span>
                    <span className="text-surface-900 dark:text-surface-100">
                      {zone.ttl}s
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Serial</span>
                    <span className="text-surface-900 dark:text-surface-100">
                      {zone.serial}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Primary NS</span>
                    <span className="text-surface-900 dark:text-surface-100 truncate max-w-[150px]">
                      {zone.primaryNs}
                    </span>
                  </div>
                </div>

                {/* Error indicator */}
                {zone.lastError && (
                  <div className="mt-4 pt-4 border-t border-surface-100 dark:border-surface-800">
                    <div className="flex items-center gap-2 text-xs text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      <span className="truncate">{zone.lastError}</span>
                    </div>
                  </div>
                )}
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
                No DNS zones found
              </h3>
              <p className="mt-2 text-surface-500 dark:text-surface-400">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Get started by creating your first DNS zone'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsCreateModalOpen(true)} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  New Zone
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Modal */}
      <DnsZoneCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete DNS Zone"
      >
        <div className="space-y-4">
          <p className="text-surface-600 dark:text-surface-400">
            Are you sure you want to delete zone{' '}
            <span className="font-medium text-surface-900 dark:text-surface-100">
              {deleteConfirm?.zoneName}
            </span>
            ? This will delete all DNS records in this zone. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteZone.isPending}
            >
              Delete Zone
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
