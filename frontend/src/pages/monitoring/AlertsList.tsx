import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  MoreVertical,
  Eye,
  Search,
} from 'lucide-react';
import { Card, CardContent, Badge, Spinner, Alert, Input, Select } from '@/components/ui';
import { useAlerts, useAcknowledgeAlert } from '@/hooks';
import type { AlertStatus, AlertSeverity } from '@/types';

const statusConfig: Record<
  AlertStatus,
  { color: 'danger' | 'success' | 'default'; icon: typeof AlertTriangle }
> = {
  FIRING: { color: 'danger', icon: AlertTriangle },
  RESOLVED: { color: 'success', icon: CheckCircle },
  ACKNOWLEDGED: { color: 'default', icon: Eye },
};

const severityColors: Record<AlertSeverity, 'default' | 'warning' | 'danger'> = {
  info: 'default',
  warning: 'warning',
  critical: 'danger',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

export function AlertsList() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  const { data: alerts, isLoading, error } = useAlerts(
    statusFilter ? { status: statusFilter } : undefined
  );
  const acknowledgeAlert = useAcknowledgeAlert();

  const filteredAlerts = alerts?.filter((alert) =>
    alert.rule?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAcknowledge = async (id: string) => {
    await acknowledgeAlert.mutateAsync(id);
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
    return <Alert variant="error">Failed to load alerts.</Alert>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <Input
            placeholder="Search alerts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="FIRING">Firing</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
          <option value="RESOLVED">Resolved</option>
        </Select>
      </div>

      {/* Alerts List */}
      {filteredAlerts && filteredAlerts.length > 0 ? (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => {
            const StatusIcon = statusConfig[alert.status].icon;
            return (
              <Card key={alert.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          alert.status === 'FIRING'
                            ? 'bg-red-100 dark:bg-red-900/30'
                            : alert.status === 'RESOLVED'
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : 'bg-surface-100 dark:bg-surface-800'
                        }`}
                      >
                        <StatusIcon
                          className={`w-5 h-5 ${
                            alert.status === 'FIRING'
                              ? 'text-red-600 dark:text-red-400'
                              : alert.status === 'RESOLVED'
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-surface-600 dark:text-surface-400'
                          }`}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-surface-900 dark:text-surface-100">
                            {alert.rule?.name || 'Unknown Alert'}
                          </span>
                          <Badge variant={statusConfig[alert.status].color} size="sm">
                            {alert.status}
                          </Badge>
                          {alert.rule?.severity && (
                            <Badge variant={severityColors[alert.rule.severity]} size="sm">
                              {alert.rule.severity}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-surface-500">
                          <span>Value: {alert.value}</span>
                          <span>Threshold: {alert.threshold}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-surface-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Fired: {formatDate(alert.firedAt)}
                          </span>
                          {alert.resolvedAt && (
                            <span>Resolved: {formatDate(alert.resolvedAt)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {alert.status === 'FIRING' && (
                      <div className="relative">
                        <button
                          onClick={() =>
                            setActionMenuOpen(actionMenuOpen === alert.id ? null : alert.id)
                          }
                          className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {actionMenuOpen === alert.id && (
                          <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 py-1 z-10">
                            <button
                              onClick={() => handleAcknowledge(alert.id)}
                              className="w-full px-4 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                              disabled={acknowledgeAlert.isPending}
                            >
                              <Eye className="w-4 h-4" /> Acknowledge
                            </button>
                          </div>
                        )}
                      </div>
                    )}
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
              <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
              <h3 className="mt-4 text-lg font-medium text-surface-900 dark:text-surface-100">
                No alerts
              </h3>
              <p className="mt-2 text-surface-500 dark:text-surface-400">
                {searchQuery || statusFilter
                  ? 'Try adjusting your filters'
                  : 'All systems are operating normally'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
