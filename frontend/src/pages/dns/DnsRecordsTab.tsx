import { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  Modal,
  Alert,
  Spinner,
} from '@/components/ui';
import { useDnsRecords, useDeleteDnsRecord, useUpdateDnsRecord } from '@/hooks';
import type { DnsZone, DnsRecord, DnsRecordType } from '@/types';
import { DnsRecordForm } from './DnsRecordForm';

interface DnsRecordsTabProps {
  zone: DnsZone;
}

const recordTypeColors: Record<DnsRecordType, string> = {
  A: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  AAAA: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  CNAME: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  MX: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  TXT: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  NS: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  SRV: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  CAA: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  PTR: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  SOA: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

export function DnsRecordsTab({ zone }: DnsRecordsTabProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<DnsRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DnsRecord | null>(null);
  const [filterType, setFilterType] = useState<DnsRecordType | 'ALL'>('ALL');

  const { data: records, isLoading, error } = useDnsRecords(zone.id);
  const deleteRecord = useDeleteDnsRecord();
  const updateRecord = useUpdateDnsRecord();

  const filteredRecords = records?.filter(
    (record) => filterType === 'ALL' || record.type === filterType
  );

  const recordTypes: DnsRecordType[] = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA', 'PTR'];

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteRecord.mutateAsync({
        id: deleteConfirm.id,
        zoneId: zone.id,
      });
      setDeleteConfirm(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleToggleEnabled = async (record: DnsRecord) => {
    await updateRecord.mutateAsync({
      id: record.id,
      data: { enabled: !record.enabled },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error">
        Failed to load DNS records.
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-surface-500">Filter:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as DnsRecordType | 'ALL')}
            className="px-3 py-1.5 text-sm rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100"
          >
            <option value="ALL">All Types</option>
            {recordTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Record
        </Button>
      </div>

      {filteredRecords && filteredRecords.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200 dark:border-surface-700">
                <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                  TTL
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-surface-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
              {filteredRecords.map((record) => (
                <tr
                  key={record.id}
                  className={`hover:bg-surface-50 dark:hover:bg-surface-800/50 ${
                    !record.enabled ? 'opacity-50' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                        recordTypeColors[record.type]
                      }`}
                    >
                      {record.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-surface-900 dark:text-surface-100 font-mono">
                    {record.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-surface-600 dark:text-surface-400 font-mono max-w-xs truncate">
                    {record.value}
                  </td>
                  <td className="px-4 py-3 text-sm text-surface-600 dark:text-surface-400">
                    {record.ttl}s
                  </td>
                  <td className="px-4 py-3 text-sm text-surface-600 dark:text-surface-400">
                    {record.priority !== undefined ? record.priority : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleEnabled(record)}
                      className={`flex items-center gap-1 text-sm ${
                        record.enabled
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-surface-400'
                      }`}
                    >
                      {record.enabled ? (
                        <>
                          <ToggleRight className="w-5 h-5" />
                          <span>Enabled</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-5 h-5" />
                          <span>Disabled</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditRecord(record)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm(record)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Plus className="w-12 h-12 mx-auto text-surface-300 dark:text-surface-600" />
              <h3 className="mt-4 text-lg font-medium text-surface-900 dark:text-surface-100">
                No records found
              </h3>
              <p className="mt-2 text-surface-500 dark:text-surface-400">
                {filterType !== 'ALL'
                  ? `No ${filterType} records in this zone`
                  : 'Add DNS records to configure your zone'}
              </p>
              <Button onClick={() => setIsCreateOpen(true)} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Add Record
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Record Modal */}
      <DnsRecordForm
        zoneId={zone.id}
        zoneName={zone.zoneName}
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      {/* Edit Record Modal */}
      {editRecord && (
        <DnsRecordForm
          zoneId={zone.id}
          zoneName={zone.zoneName}
          record={editRecord}
          isOpen={!!editRecord}
          onClose={() => setEditRecord(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Record"
      >
        <div className="space-y-4">
          <p className="text-surface-600 dark:text-surface-400">
            Are you sure you want to delete this{' '}
            <span className="font-medium text-surface-900 dark:text-surface-100">
              {deleteConfirm?.type}
            </span>{' '}
            record for{' '}
            <span className="font-medium text-surface-900 dark:text-surface-100">
              {deleteConfirm?.name}
            </span>
            ?
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteRecord.isPending}
            >
              Delete Record
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
