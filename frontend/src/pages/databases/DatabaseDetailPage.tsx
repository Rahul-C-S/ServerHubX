import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Database as DatabaseIcon,
  Users,
  HardDrive,
  RefreshCw,
  Download,
  Settings,
  Table,
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
import { useDatabase, useRefreshDatabaseStats } from '@/hooks';
import type { DatabaseStatus } from '@/types';
import { DatabaseUsersTab } from './DatabaseUsersTab';
import { DatabaseBackupTab } from './DatabaseBackupTab';
import { DatabaseInfoTab } from './DatabaseInfoTab';

const statusColors: Record<DatabaseStatus, 'success' | 'warning' | 'danger' | 'default'> = {
  ACTIVE: 'success',
  CREATING: 'warning',
  ERROR: 'danger',
  SUSPENDED: 'default',
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function DatabaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: database, isLoading, error } = useDatabase(id!);
  const refreshStats = useRefreshDatabaseStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !database) {
    return (
      <Alert variant="error">
        Failed to load database. Please try again later.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/databases')}
            className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
                {database.name}
              </h1>
              <Badge variant={statusColors[database.status]}>{database.status}</Badge>
              <Badge variant="default">{database.type}</Badge>
            </div>
            {database.description && (
              <p className="text-surface-600 dark:text-surface-400 mt-1">
                {database.description}
              </p>
            )}
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={() => refreshStats.mutate(database.id)}
          isLoading={refreshStats.isPending}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Stats
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-surface-500">Size</p>
                <p className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                  {formatBytes(database.sizeBytes)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Table className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-surface-500">Tables</p>
                <p className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                  {database.tableCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-surface-500">Users</p>
                <p className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                  {database.users?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <DatabaseIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-surface-500">Charset</p>
                <p className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                  {database.charset}
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
          <TabsTrigger value="users">
            <Users className="w-4 h-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="backup">
            <Download className="w-4 h-4 mr-2" />
            Backup & Restore
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <DatabaseInfoTab database={database} />
        </TabsContent>

        <TabsContent value="users">
          <DatabaseUsersTab databaseId={database.id} />
        </TabsContent>

        <TabsContent value="backup">
          <DatabaseBackupTab database={database} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
