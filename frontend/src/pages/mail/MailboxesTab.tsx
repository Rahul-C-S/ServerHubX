import { useState } from 'react';
import { Plus, Trash2, Edit2, Mail, HardDrive } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  Modal,
  Alert,
  Spinner,
  Badge,
} from '@/components/ui';
import { useMailboxes, useDeleteMailbox } from '@/hooks';
import type { MailDomain, Mailbox } from '@/types';
import { MailboxForm } from './MailboxForm';

interface MailboxesTabProps {
  mailDomain: MailDomain;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getQuotaPercentage(used: number, quota: number): number {
  if (quota === 0) return 0;
  return Math.min(100, Math.round((used / quota) * 100));
}

export function MailboxesTab({ mailDomain }: MailboxesTabProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editMailbox, setEditMailbox] = useState<Mailbox | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Mailbox | null>(null);

  const { data: mailboxes, isLoading, error } = useMailboxes(mailDomain.id);
  const deleteMailbox = useDeleteMailbox();

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteMailbox.mutateAsync({
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
    return <Alert variant="error">Failed to load mailboxes.</Alert>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-surface-500">
          {mailboxes?.length || 0} mailbox{mailboxes?.length !== 1 ? 'es' : ''}
          {mailDomain.maxMailboxes > 0 && ` of ${mailDomain.maxMailboxes}`}
        </p>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Mailbox
        </Button>
      </div>

      {mailboxes && mailboxes.length > 0 ? (
        <div className="space-y-3">
          {mailboxes.map((mailbox) => {
            const quotaPercent = getQuotaPercentage(mailbox.usedBytes, mailbox.quotaBytes);
            const quotaWarning = quotaPercent >= 80;

            return (
              <Card key={mailbox.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-surface-100 dark:bg-surface-800">
                        <Mail className="w-5 h-5 text-surface-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-surface-900 dark:text-surface-100">
                            {mailbox.email}
                          </h3>
                          {!mailbox.isActive && (
                            <Badge variant="warning">Inactive</Badge>
                          )}
                          {mailbox.forwardingEnabled && (
                            <Badge variant="info">Forwarding</Badge>
                          )}
                          {mailbox.autoReplyEnabled && (
                            <Badge variant="default">Auto-reply</Badge>
                          )}
                        </div>
                        {mailbox.displayName && (
                          <p className="text-sm text-surface-500">
                            {mailbox.displayName}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-surface-400">
                          <span className="flex items-center gap-1">
                            <HardDrive className="w-4 h-4" />
                            {formatBytes(mailbox.usedBytes)} / {formatBytes(mailbox.quotaBytes)}
                          </span>
                        </div>
                        {/* Quota bar */}
                        <div className="mt-2 w-48 h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              quotaWarning
                                ? 'bg-yellow-500'
                                : 'bg-primary-500'
                            }`}
                            style={{ width: `${quotaPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditMailbox(mailbox)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm(mailbox)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Mail className="w-12 h-12 mx-auto text-surface-300 dark:text-surface-600" />
              <h3 className="mt-4 text-lg font-medium text-surface-900 dark:text-surface-100">
                No mailboxes
              </h3>
              <p className="mt-2 text-surface-500">
                Create a mailbox to start receiving emails.
              </p>
              <Button onClick={() => setIsCreateOpen(true)} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Create Mailbox
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Mailbox Modal */}
      <MailboxForm
        mailDomain={mailDomain}
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      {/* Edit Mailbox Modal */}
      {editMailbox && (
        <MailboxForm
          mailDomain={mailDomain}
          mailbox={editMailbox}
          isOpen={!!editMailbox}
          onClose={() => setEditMailbox(null)}
        />
      )}

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Mailbox"
      >
        <div className="space-y-4">
          <p className="text-surface-600 dark:text-surface-400">
            Are you sure you want to delete{' '}
            <span className="font-medium text-surface-900 dark:text-surface-100">
              {deleteConfirm?.email}
            </span>
            ?
          </p>
          <Alert variant="warning">
            All emails in this mailbox will be permanently deleted.
          </Alert>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteMailbox.isPending}
            >
              Delete Mailbox
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
