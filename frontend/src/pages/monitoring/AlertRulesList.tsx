import { useState } from 'react';
import {
  Bell,
  Plus,
  MoreVertical,
  Trash2,
  Pause,
  Play,
  FlaskConical,
} from 'lucide-react';
import { Card, CardContent, Badge, Spinner, Alert, Button, Modal } from '@/components/ui';
import {
  useAlertRules,
  useDeleteAlertRule,
  useUpdateAlertRule,
  useTestAlertRule,
} from '@/hooks';
import type { AlertRule, AlertSeverity } from '@/types';

interface AlertRulesListProps {
  onCreateClick: () => void;
}

const severityColors: Record<AlertSeverity, 'default' | 'warning' | 'danger'> = {
  info: 'default',
  warning: 'warning',
  critical: 'danger',
};

const metricLabels: Record<string, string> = {
  CPU_USAGE: 'CPU Usage',
  MEMORY_USAGE: 'Memory Usage',
  DISK_USAGE: 'Disk Usage',
  NETWORK_IN: 'Network In',
  NETWORK_OUT: 'Network Out',
  SERVICE_STATUS: 'Service Status',
  APP_STATUS: 'App Status',
  APP_MEMORY: 'App Memory',
  APP_CPU: 'App CPU',
  APP_RESTARTS: 'App Restarts',
};

const operatorSymbols: Record<string, string> = {
  GREATER_THAN: '>',
  LESS_THAN: '<',
  EQUALS: '=',
  NOT_EQUALS: '!=',
  GREATER_THAN_OR_EQUAL: '>=',
  LESS_THAN_OR_EQUAL: '<=',
};

export function AlertRulesList({ onCreateClick }: AlertRulesListProps) {
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<AlertRule | null>(null);
  const [testResult, setTestResult] = useState<{
    rule: AlertRule;
    result: { triggered: boolean; value: number; threshold: number };
  } | null>(null);

  const { data: rules, isLoading, error } = useAlertRules();
  const deleteRule = useDeleteAlertRule();
  const updateRule = useUpdateAlertRule();
  const testRule = useTestAlertRule();

  const handleToggleEnabled = async (rule: AlertRule) => {
    await updateRule.mutateAsync({
      id: rule.id,
      data: { enabled: !rule.enabled },
    });
    setActionMenuOpen(null);
  };

  const handleTest = async (rule: AlertRule) => {
    const result = await testRule.mutateAsync(rule.id);
    setTestResult({ rule, result });
    setActionMenuOpen(null);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteRule.mutateAsync(deleteConfirm.id);
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
    return <Alert variant="error">Failed to load alert rules.</Alert>;
  }

  if (!rules || rules.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Bell className="w-12 h-12 mx-auto text-surface-300 dark:text-surface-600" />
            <h3 className="mt-4 text-lg font-medium text-surface-900 dark:text-surface-100">
              No alert rules
            </h3>
            <p className="mt-2 text-surface-500 dark:text-surface-400">
              Create alert rules to get notified of issues
            </p>
            <Button onClick={onCreateClick} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Create Alert Rule
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {rules.map((rule) => (
        <Card key={rule.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    rule.enabled
                      ? 'bg-blue-100 dark:bg-blue-900/30'
                      : 'bg-surface-100 dark:bg-surface-800'
                  }`}
                >
                  <Bell
                    className={`w-5 h-5 ${
                      rule.enabled
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-surface-400'
                    }`}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-surface-900 dark:text-surface-100">
                      {rule.name}
                    </span>
                    <Badge variant={rule.enabled ? 'success' : 'default'} size="sm">
                      {rule.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                    <Badge variant={severityColors[rule.severity]} size="sm">
                      {rule.severity}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-surface-500">
                    <span>{metricLabels[rule.metric] || rule.metric}</span>
                    <span>{operatorSymbols[rule.operator] || rule.operator}</span>
                    <span>{rule.threshold}</span>
                    <span className="text-surface-400">
                      for {rule.durationSeconds}s
                    </span>
                  </div>
                  {rule.description && (
                    <p className="mt-1 text-xs text-surface-400">{rule.description}</p>
                  )}
                </div>
              </div>
              <div className="relative">
                <button
                  onClick={() =>
                    setActionMenuOpen(actionMenuOpen === rule.id ? null : rule.id)
                  }
                  className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {actionMenuOpen === rule.id && (
                  <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 py-1 z-10">
                    <button
                      onClick={() => handleTest(rule)}
                      className="w-full px-4 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                    >
                      <FlaskConical className="w-4 h-4" /> Test Rule
                    </button>
                    <button
                      onClick={() => handleToggleEnabled(rule)}
                      className="w-full px-4 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                    >
                      {rule.enabled ? (
                        <>
                          <Pause className="w-4 h-4" /> Disable
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" /> Enable
                        </>
                      )}
                    </button>
                    <hr className="my-1 border-surface-200 dark:border-surface-700" />
                    <button
                      onClick={() => {
                        setDeleteConfirm(rule);
                        setActionMenuOpen(null);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Alert Rule"
      >
        <div className="space-y-4">
          <p className="text-surface-600 dark:text-surface-400">
            Are you sure you want to delete the rule &quot;{deleteConfirm?.name}&quot;?
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteRule.isPending}
            >
              Delete Rule
            </Button>
          </div>
        </div>
      </Modal>

      {/* Test Result Modal */}
      <Modal
        isOpen={!!testResult}
        onClose={() => setTestResult(null)}
        title="Test Result"
      >
        {testResult && (
          <div className="space-y-4">
            <Alert variant={testResult.result.triggered ? 'warning' : 'success'}>
              {testResult.result.triggered
                ? 'This rule would trigger an alert'
                : 'This rule would not trigger an alert'}
            </Alert>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-surface-500">Current Value:</span>
                <span className="font-medium text-surface-900 dark:text-surface-100">
                  {testResult.result.value}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Threshold:</span>
                <span className="font-medium text-surface-900 dark:text-surface-100">
                  {testResult.result.threshold}
                </span>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setTestResult(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
