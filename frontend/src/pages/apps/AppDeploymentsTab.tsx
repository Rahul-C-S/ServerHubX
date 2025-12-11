import { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  Spinner,
  Alert,
} from '@/components/ui';
import { useAppDeployments, useDeployApp } from '@/hooks';
import { appsApi } from '@/lib/api';
import type { DeploymentStatus } from '@/types';

interface AppDeploymentsTabProps {
  appId: string;
}

const stateColors: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  completed: 'success',
  active: 'warning',
  waiting: 'default',
  delayed: 'default',
  failed: 'danger',
};

const stateIcons: Record<string, React.ReactNode> = {
  completed: <CheckCircle className="w-4 h-4" />,
  active: <Loader className="w-4 h-4 animate-spin" />,
  waiting: <Clock className="w-4 h-4" />,
  delayed: <Clock className="w-4 h-4" />,
  failed: <XCircle className="w-4 h-4" />,
};

export function AppDeploymentsTab({ appId }: AppDeploymentsTabProps) {
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const { data: deployments, isLoading, error, refetch } = useAppDeployments(appId);
  const deployApp = useDeployApp();

  const handleRetry = async (jobId: string) => {
    try {
      await appsApi.retryDeployment(appId, jobId);
      refetch();
    } catch (err) {
      // Error handled
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
        Failed to load deployments. Please try again later.
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Deployment History</h3>
            <p className="text-sm text-surface-500 mt-1">
              View recent deployments and their status
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => deployApp.mutate(appId)}
              isLoading={deployApp.isPending}
            >
              New Deployment
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {deployments && deployments.length > 0 ? (
          <div className="space-y-3">
            {deployments.map((deployment) => (
              <DeploymentItem
                key={deployment.jobId}
                deployment={deployment}
                isExpanded={expandedJob === deployment.jobId}
                onToggle={() =>
                  setExpandedJob(
                    expandedJob === deployment.jobId ? null : deployment.jobId
                  )
                }
                onRetry={() => handleRetry(deployment.jobId)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-surface-500">
            <p>No deployments yet.</p>
            <p className="text-sm mt-1">
              Click "New Deployment" to deploy your application.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface DeploymentItemProps {
  deployment: DeploymentStatus;
  isExpanded: boolean;
  onToggle: () => void;
  onRetry: () => void;
}

function DeploymentItem({
  deployment,
  isExpanded,
  onToggle,
  onRetry,
}: DeploymentItemProps) {
  return (
    <div className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800"
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          <div className={`text-${stateColors[deployment.state]}-500`}>
            {stateIcons[deployment.state]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-surface-900 dark:text-surface-100">
                {deployment.action.charAt(0).toUpperCase() + deployment.action.slice(1)}
              </span>
              <Badge variant={stateColors[deployment.state]} size="sm">
                {deployment.state}
              </Badge>
            </div>
            <p className="text-sm text-surface-500 mt-1">
              {new Date(deployment.createdAt).toLocaleString()}
              {deployment.result?.duration && (
                <span className="ml-2">
                  ({(deployment.result.duration / 1000).toFixed(1)}s)
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {deployment.state === 'active' && (
            <div className="flex items-center gap-2 mr-4">
              <div className="w-24 h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all duration-300"
                  style={{ width: `${deployment.progress}%` }}
                />
              </div>
              <span className="text-sm text-surface-500">{deployment.progress}%</span>
            </div>
          )}
          {deployment.state === 'failed' && (
            <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onRetry(); }}>
              Retry
            </Button>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-surface-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-surface-400" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-surface-200 dark:border-surface-700 p-4 bg-surface-50 dark:bg-surface-800/50">
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <p className="text-surface-500">Job ID</p>
              <p className="font-mono text-surface-900 dark:text-surface-100">
                {deployment.jobId}
              </p>
            </div>
            <div>
              <p className="text-surface-500">Action</p>
              <p className="text-surface-900 dark:text-surface-100">
                {deployment.action}
              </p>
            </div>
            {deployment.processedAt && (
              <div>
                <p className="text-surface-500">Started</p>
                <p className="text-surface-900 dark:text-surface-100">
                  {new Date(deployment.processedAt).toLocaleString()}
                </p>
              </div>
            )}
            {deployment.finishedAt && (
              <div>
                <p className="text-surface-500">Finished</p>
                <p className="text-surface-900 dark:text-surface-100">
                  {new Date(deployment.finishedAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {deployment.result?.error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">Error</p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {deployment.result.error}
              </p>
            </div>
          )}

          {deployment.logs && deployment.logs.length > 0 && (
            <div>
              <p className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                Logs
              </p>
              <div className="bg-surface-900 dark:bg-black rounded-lg p-3 font-mono text-xs max-h-48 overflow-auto">
                {deployment.logs.map((log, index) => (
                  <div key={index} className="text-green-400">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
