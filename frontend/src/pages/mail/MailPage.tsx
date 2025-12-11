import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Settings, ToggleLeft, ToggleRight, Shield } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  Spinner,
  Alert,
  Badge,
} from '@/components/ui';
import { useMailDomains } from '@/hooks';
import type { MailDomain } from '@/types';
import { MailEnableModal } from './MailEnableModal';

export function MailPage() {
  const navigate = useNavigate();
  const [enableDomainId, setEnableDomainId] = useState<string | null>(null);

  const { data: mailDomains, isLoading, error } = useMailDomains();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="error">Failed to load mail domains.</Alert>
      </div>
    );
  }

  const handleDomainClick = (mailDomain: MailDomain) => {
    navigate(`/mail/${mailDomain.id}`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
            Email Management
          </h1>
          <p className="mt-1 text-surface-500">
            Manage email domains, mailboxes, and aliases
          </p>
        </div>
      </div>

      {mailDomains && mailDomains.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mailDomains.map((mailDomain) => (
            <Card
              key={mailDomain.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleDomainClick(mailDomain)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
                      <Mail className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-surface-900 dark:text-surface-100">
                        {mailDomain.domainName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {mailDomain.enabled ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <ToggleRight className="w-4 h-4" />
                            Enabled
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-surface-400">
                            <ToggleLeft className="w-4 h-4" />
                            Disabled
                          </span>
                        )}
                        {mailDomain.dkimEnabled && (
                          <Badge variant="info" className="text-xs">
                            <Shield className="w-3 h-3 mr-1" />
                            DKIM
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-surface-500">Mailboxes</p>
                    <p className="font-medium text-surface-900 dark:text-surface-100">
                      {mailDomain.mailboxes?.length || 0}
                      {mailDomain.maxMailboxes > 0 && (
                        <span className="text-surface-400"> / {mailDomain.maxMailboxes}</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-surface-500">Aliases</p>
                    <p className="font-medium text-surface-900 dark:text-surface-100">
                      {mailDomain.aliases?.length || 0}
                      {mailDomain.maxAliases > 0 && (
                        <span className="text-surface-400"> / {mailDomain.maxAliases}</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/mail/${mailDomain.id}/settings`);
                    }}
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Mail className="w-16 h-16 mx-auto text-surface-300 dark:text-surface-600" />
              <h3 className="mt-4 text-lg font-medium text-surface-900 dark:text-surface-100">
                No email domains configured
              </h3>
              <p className="mt-2 text-surface-500 dark:text-surface-400 max-w-md mx-auto">
                Enable email for your domains to start creating mailboxes and
                managing email aliases.
              </p>
              <p className="mt-4 text-sm text-surface-400">
                Go to a domain's settings to enable email functionality.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enable Mail Modal */}
      {enableDomainId && (
        <MailEnableModal
          domainId={enableDomainId}
          isOpen={!!enableDomainId}
          onClose={() => setEnableDomainId(null)}
        />
      )}
    </div>
  );
}
