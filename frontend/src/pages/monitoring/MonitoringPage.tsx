import { useState } from 'react';
import {
  Activity,
  Cpu,
  HardDrive,
  MemoryStick,
  Bell,
  Plus,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  Badge,
  Spinner,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Button,
} from '@/components/ui';
import { useCurrentMetrics, useAlerts, useAlertRules, useServices } from '@/hooks';
import { AlertRulesList } from './AlertRulesList';
import { AlertsList } from './AlertsList';
import { ServicesList } from './ServicesList';
import { AlertRuleCreateModal } from './AlertRuleCreateModal';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

interface MetricCardProps {
  icon: typeof Cpu;
  title: string;
  value: string;
  subtitle?: string;
  color: string;
  percentage?: number;
}

function MetricCard({ icon: Icon, title, value, subtitle, color, percentage }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-surface-500 dark:text-surface-400">{title}</p>
            <p className="text-2xl font-bold text-surface-900 dark:text-surface-100 mt-1">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-surface-400 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        {percentage !== undefined && (
          <div className="mt-3">
            <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  percentage > 90
                    ? 'bg-red-500'
                    : percentage > 70
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MonitoringPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);

  const { data: metrics, isLoading: metricsLoading } = useCurrentMetrics();
  const { data: alerts } = useAlerts({ status: 'FIRING' });
  const { data: rules } = useAlertRules();
  const { data: services } = useServices();

  const firingAlerts = alerts?.filter((a) => a.status === 'FIRING') || [];

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
            Monitoring
          </h1>
          <p className="text-surface-600 dark:text-surface-400 mt-1">
            System metrics, alerts, and service status
          </p>
        </div>
        <div className="flex items-center gap-3">
          {firingAlerts.length > 0 && (
            <Badge variant="danger" size="md">
              <AlertTriangle className="w-4 h-4 mr-1" />
              {firingAlerts.length} Active Alert{firingAlerts.length !== 1 ? 's' : ''}
            </Badge>
          )}
          <Button onClick={() => setIsRuleModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Alert Rule
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={Cpu}
            title="CPU Usage"
            value={`${metrics.system.cpu.usage.toFixed(1)}%`}
            subtitle={`${metrics.system.cpu.cores} cores`}
            color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
            percentage={metrics.system.cpu.usage}
          />
          <MetricCard
            icon={MemoryStick}
            title="Memory"
            value={`${metrics.system.memory.usagePercent.toFixed(1)}%`}
            subtitle={`${formatBytes(metrics.system.memory.used)} / ${formatBytes(
              metrics.system.memory.total
            )}`}
            color="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
            percentage={metrics.system.memory.usagePercent}
          />
          <MetricCard
            icon={HardDrive}
            title="Disk (Root)"
            value={`${metrics.system.disk[0]?.usagePercent.toFixed(1) || 0}%`}
            subtitle={`${formatBytes(metrics.system.disk[0]?.used || 0)} / ${formatBytes(
              metrics.system.disk[0]?.total || 0
            )}`}
            color="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
            percentage={metrics.system.disk[0]?.usagePercent || 0}
          />
          <MetricCard
            icon={Activity}
            title="Uptime"
            value={formatUptime(metrics.system.uptime)}
            subtitle={`Load: ${metrics.system.cpu.loadAverage[0]?.toFixed(2) || '0.00'}`}
            color="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
          />
        </div>
      )}

      {/* Quick Status */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-surface-500" />
                <span className="font-medium text-surface-700 dark:text-surface-300">
                  Alert Rules
                </span>
              </div>
              <span className="text-2xl font-bold text-surface-900 dark:text-surface-100">
                {rules?.length || 0}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="font-medium text-surface-700 dark:text-surface-300">
                  Firing Alerts
                </span>
              </div>
              <span className="text-2xl font-bold text-red-600">{firingAlerts.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-medium text-surface-700 dark:text-surface-300">
                  Services Online
                </span>
              </div>
              <span className="text-2xl font-bold text-green-600">
                {services?.filter((s) => s.running).length || 0}/{services?.length || 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <Activity className="w-4 h-4 mr-2" />
            Services
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="rules">
            <Bell className="w-4 h-4 mr-2" />
            Alert Rules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <ServicesList />
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <AlertsList />
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <AlertRulesList onCreateClick={() => setIsRuleModalOpen(true)} />
        </TabsContent>
      </Tabs>

      {/* Create Alert Rule Modal */}
      <AlertRuleCreateModal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
      />
    </div>
  );
}
