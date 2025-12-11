import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Square,
  RefreshCw,
  Rocket,
  Settings,
  Terminal,
  Key,
  GitBranch,
  Clock,
  Cpu,
  HardDrive,
  AlertCircle,
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
import {
  useApp,
  useStartApp,
  useStopApp,
  useRestartApp,
  useReloadApp,
  useDeployApp,
} from '@/hooks';
import type { AppStatus } from '@/types';
import { AppSettingsTab } from './AppSettingsTab';
import { AppLogsTab } from './AppLogsTab';
import { AppEnvTab } from './AppEnvTab';
import { AppDeploymentsTab } from './AppDeploymentsTab';

const statusColors: Record<AppStatus, 'success' | 'warning' | 'danger' | 'default'> = {
  RUNNING: 'success',
  PENDING: 'warning',
  DEPLOYING: 'warning',
  STOPPED: 'default',
  ERROR: 'danger',
  MAINTENANCE: 'warning',
};

export function AppDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: app, isLoading, error } = useApp(id!);
  const startApp = useStartApp();
  const stopApp = useStopApp();
  const restartApp = useRestartApp();
  useReloadApp(); // Available for future use
  const deployApp = useDeployApp();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !app) {
    return (
      <Alert variant="error">
        Failed to load application. Please try again later.
      </Alert>
    );
  }

  const isNodeApp = app.type === 'NODEJS';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/apps')}
            className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
                {app.name}
              </h1>
              <Badge variant={statusColors[app.status]}>{app.status}</Badge>
              <Badge variant="default">{app.type}</Badge>
            </div>
            <p className="text-surface-600 dark:text-surface-400 mt-1">
              {app.domain?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isNodeApp && (
            <>
              {app.status === 'STOPPED' ? (
                <Button
                  variant="secondary"
                  onClick={() => startApp.mutate(app.id)}
                  isLoading={startApp.isPending}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => stopApp.mutate(app.id)}
                  isLoading={stopApp.isPending}
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => restartApp.mutate(app.id)}
                isLoading={restartApp.isPending}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Restart
              </Button>
            </>
          )}
          <Button
            onClick={() => deployApp.mutate(app.id)}
            isLoading={deployApp.isPending}
          >
            <Rocket className="w-4 h-4 mr-2" />
            Deploy
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {app.lastError && (
        <Alert variant="error" className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Last Error</p>
            <p className="text-sm mt-1">{app.lastError}</p>
          </div>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Cpu className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-surface-500">CPU</p>
                <p className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                  {app.processInfo?.cpu?.toFixed(1) || '0'}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-surface-500">Memory</p>
                <p className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                  {app.processInfo?.memory
                    ? `${Math.round(app.processInfo.memory / 1024 / 1024)} MB`
                    : '0 MB'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-surface-500">Uptime</p>
                <p className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                  {app.processInfo?.uptime
                    ? formatUptime(app.processInfo.uptime)
                    : '--'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-surface-500">Restarts</p>
                <p className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                  {app.processInfo?.restarts || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <Settings className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Terminal className="w-4 h-4 mr-2" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="env">
            <Key className="w-4 h-4 mr-2" />
            Environment
          </TabsTrigger>
          <TabsTrigger value="deployments">
            <GitBranch className="w-4 h-4 mr-2" />
            Deployments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <AppSettingsTab app={app} />
        </TabsContent>

        <TabsContent value="logs">
          <AppLogsTab appId={app.id} appType={app.type} />
        </TabsContent>

        <TabsContent value="env">
          <AppEnvTab appId={app.id} />
        </TabsContent>

        <TabsContent value="deployments">
          <AppDeploymentsTab appId={app.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}
