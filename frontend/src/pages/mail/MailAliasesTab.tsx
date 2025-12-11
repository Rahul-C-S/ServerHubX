import { useState } from 'react';
import { Plus, Trash2, Edit2, Forward, ArrowRight } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  Modal,
  Alert,
  Spinner,
  Badge,
} from '@/components/ui';
import { useMailAliases, useDeleteMailAlias } from '@/hooks';
import type { MailDomain, MailAlias, AliasType } from '@/types';
import { MailAliasForm } from './MailAliasForm';

interface MailAliasesTabProps {
  mailDomain: MailDomain;
}

const aliasTypeLabels: Record<AliasType, string> = {
  FORWARD: 'Forward',
  LOCAL: 'Local',
  CATCH_ALL: 'Catch-All',
  GROUP: 'Group',
};

export function MailAliasesTab({ mailDomain }: MailAliasesTabProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editAlias, setEditAlias] = useState<MailAlias | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<MailAlias | null>(null);

  const { data: aliases, isLoading, error } = useMailAliases(mailDomain.id);
  const deleteAlias = useDeleteMailAlias();

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteAlias.mutateAsync({
        id: deleteConfirm.id,
        mailDomainId: mailDomain.id,
      });
      setDeleteConfirm(null);
    } catch {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <Alert variant="error">Failed to load aliases.</Alert>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-surface-500">
          {aliases?.length || 0} alias{aliases?.length !== 1 ? 'es' : ''}
          {mailDomain.maxAliases > 0 && ` of ${mailDomain.maxAliases}`}
        </p>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Alias
        </Button>
      </div>

      {aliases && aliases.length > 0 ? (
        <div className="space-y-3">
          {aliases.map((alias) => (
            <Card key={alias.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-surface-100 dark:bg-surface-800">
                      <Forward className="w-5 h-5 text-surface-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-surface-900 dark:text-surface-100 font-mono">
                          {alias.source}
                        </span>
                        <ArrowRight className="w-4 h-4 text-surface-400" />
                        <div className="flex flex-wrap gap-1">
                          {alias.destinations.map((dest, idx) => (
                            <span
                              key={idx}
                              className="text-sm text-primary-600 dark:text-primary-400 font-mono"
                            >
                              {dest}
                              {idx < alias.destinations.length - 1 && ', '}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="default">
                          {aliasTypeLabels[alias.type]}
                        </Badge>
                        {!alias.enabled && (
                          <Badge variant="warning">Disabled</Badge>
                        )}
                      </div>
                      {alias.description && (
                        <p className="text-sm text-surface-500 mt-1">
                          {alias.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditAlias(alias)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirm(alias)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
              <Forward className="w-12 h-12 mx-auto text-surface-300 dark:text-surface-600" />
              <h3 className="mt-4 text-lg font-medium text-surface-900 dark:text-surface-100">
                No aliases
              </h3>
              <p className="mt-2 text-surface-500">
                Create aliases to forward emails to other addresses.
              </p>
              <Button onClick={() => setIsCreateOpen(true)} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Create Alias
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Alias Modal */}
      <MailAliasForm
        mailDomain={mailDomain}
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      {/* Edit Alias Modal */}
      {editAlias && (
        <MailAliasForm
          mailDomain={mailDomain}
          alias={editAlias}
          isOpen={!!editAlias}
          onClose={() => setEditAlias(null)}
        />
      )}

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Alias"
      >
        <div className="space-y-4">
          <p className="text-surface-600 dark:text-surface-400">
            Are you sure you want to delete the alias{' '}
            <span className="font-medium text-surface-900 dark:text-surface-100 font-mono">
              {deleteConfirm?.source}
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
              isLoading={deleteAlias.isPending}
            >
              Delete Alias
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
