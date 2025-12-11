import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Globe,
  Settings,
  FileText,
  RefreshCw,
  Wand2,
} from 'lucide-react';
import {
  Button,
  Badge,
  Card,
  CardContent,
  Spinner,
  Alert,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui';
import { useDnsZone, useApplyDnsTemplate } from '@/hooks';
import type { ZoneStatus } from '@/types';
import { DnsRecordsTab } from './DnsRecordsTab';
import { DnsZoneSettingsTab } from './DnsZoneSettingsTab';
import { DnsTemplateModal } from './DnsTemplateModal';

const statusColors: Record<ZoneStatus, 'success' | 'warning' | 'danger' | 'default'> = {
  ACTIVE: 'success',
  PENDING: 'warning',
  ERROR: 'danger',
  DISABLED: 'default',
};

export function DnsZoneDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('records');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const { data: zone, isLoading, error } = useDnsZone(id!);
  const applyTemplate = useApplyDnsTemplate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !zone) {
    return (
      <Alert variant="error">
        Failed to load DNS zone. Please try again later.
      </Alert>
    );
  }

  const handleApplyTemplate = async (templateName: string) => {
    await applyTemplate.mutateAsync({
      zoneId: zone.id,
      templateName,
    });
    setIsTemplateModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dns')}
            className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
                {zone.zoneName}
              </h1>
              <Badge variant={statusColors[zone.status]}>{zone.status}</Badge>
            </div>
            {zone.domain && (
              <p className="text-surface-600 dark:text-surface-400 mt-1">
                Linked to domain: {zone.domain.name}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => setIsTemplateModalOpen(true)}
          >
            <Wand2 className="w-4 h-4 mr-2" />
            Apply Template
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {zone.lastError && (
        <Alert variant="error">
          <p className="font-medium">Zone Error</p>
          <p className="text-sm mt-1">{zone.lastError}</p>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-surface-500">Records</p>
                <p className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                  {zone.records?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-surface-500">Serial</p>
                <p className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                  {zone.serial}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Globe className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-surface-500">TTL</p>
                <p className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                  {zone.ttl}s
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Settings className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-surface-500">Primary NS</p>
                <p className="text-lg font-semibold text-surface-900 dark:text-surface-100 truncate max-w-[120px]">
                  {zone.primaryNs}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="records">
            <FileText className="w-4 h-4 mr-2" />
            Records
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Zone Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="records">
          <DnsRecordsTab zone={zone} />
        </TabsContent>

        <TabsContent value="settings">
          <DnsZoneSettingsTab zone={zone} />
        </TabsContent>
      </Tabs>

      {/* Template Modal */}
      <DnsTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onApply={handleApplyTemplate}
        isLoading={applyTemplate.isPending}
      />
    </div>
  );
}
