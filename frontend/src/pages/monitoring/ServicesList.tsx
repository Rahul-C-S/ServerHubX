import { useState } from 'react';
import {
  Server,
  Play,
  Square,
  RotateCcw,
  CheckCircle,
  XCircle,
  MoreVertical,
} from 'lucide-react';
import { Card, CardContent, Badge, Spinner, Alert } from '@/components/ui';
import { useServices, useControlService } from '@/hooks';

function formatBytes(bytes: number): string {
  if (!bytes) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export function ServicesList() {
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const { data: services, isLoading, error } = useServices();
  const controlService = useControlService();

  const handleServiceAction = async (name: string, action: 'start' | 'stop' | 'restart') => {
    await controlService.mutateAsync({ name, action });
    setActionMenuOpen(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <Alert variant="error">Failed to load services.</Alert>;
  }

  if (!services || services.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Server className="w-12 h-12 mx-auto text-surface-300 dark:text-surface-600" />
            <h3 className="mt-4 text-lg font-medium text-surface-900 dark:text-surface-100">
              No services found
            </h3>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {services.map((service) => (
        <Card key={service.name}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    service.running
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-red-100 dark:bg-red-900/30'
                  }`}
                >
                  {service.running ? (
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-surface-900 dark:text-surface-100">
                      {service.name}
                    </span>
                    <Badge variant={service.running ? 'success' : 'danger'} size="sm">
                      {service.running ? 'Running' : 'Stopped'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-surface-500">
                    {service.pid && <span>PID: {service.pid}</span>}
                    {service.memory && <span>Memory: {formatBytes(service.memory)}</span>}
                    {service.cpu !== undefined && <span>CPU: {service.cpu.toFixed(1)}%</span>}
                    {service.enabled !== undefined && (
                      <span>{service.enabled ? 'Enabled' : 'Disabled'}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="relative">
                <button
                  onClick={() =>
                    setActionMenuOpen(actionMenuOpen === service.name ? null : service.name)
                  }
                  className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {actionMenuOpen === service.name && (
                  <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 py-1 z-10">
                    {service.running ? (
                      <>
                        <button
                          onClick={() => handleServiceAction(service.name, 'restart')}
                          className="w-full px-4 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                          disabled={controlService.isPending}
                        >
                          <RotateCcw className="w-4 h-4" /> Restart
                        </button>
                        <button
                          onClick={() => handleServiceAction(service.name, 'stop')}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                          disabled={controlService.isPending}
                        >
                          <Square className="w-4 h-4" /> Stop
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleServiceAction(service.name, 'start')}
                        className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2"
                        disabled={controlService.isPending}
                      >
                        <Play className="w-4 h-4" /> Start
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
