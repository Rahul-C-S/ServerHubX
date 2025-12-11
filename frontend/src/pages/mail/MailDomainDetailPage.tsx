import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Users, Forward, Settings, Shield } from 'lucide-react';
import { Button, Spinner, Alert, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { useMailDomain } from '@/hooks';
import { MailboxesTab } from './MailboxesTab';
import { MailAliasesTab } from './MailAliasesTab';
import { MailSettingsTab } from './MailSettingsTab';
import { MailDnsTab } from './MailDnsTab';

export function MailDomainDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('mailboxes');

  const { data: mailDomain, isLoading, error } = useMailDomain(id!);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !mailDomain) {
    return (
      <div className="p-6">
        <Alert variant="error">Failed to load mail domain.</Alert>
        <Button variant="secondary" onClick={() => navigate('/mail')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Email
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mail')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
              {mailDomain.domainName}
            </h1>
          </div>
          <p className="text-surface-500 mt-1">
            {mailDomain.mailboxes?.length || 0} mailboxes,{' '}
            {mailDomain.aliases?.length || 0} aliases
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="mailboxes">
            <Users className="w-4 h-4 mr-2" />
            Mailboxes
          </TabsTrigger>
          <TabsTrigger value="aliases">
            <Forward className="w-4 h-4 mr-2" />
            Aliases
          </TabsTrigger>
          <TabsTrigger value="dns">
            <Shield className="w-4 h-4 mr-2" />
            DNS Records
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mailboxes">
          <MailboxesTab mailDomain={mailDomain} />
        </TabsContent>

        <TabsContent value="aliases">
          <MailAliasesTab mailDomain={mailDomain} />
        </TabsContent>

        <TabsContent value="dns">
          <MailDnsTab mailDomain={mailDomain} />
        </TabsContent>

        <TabsContent value="settings">
          <MailSettingsTab mailDomain={mailDomain} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
