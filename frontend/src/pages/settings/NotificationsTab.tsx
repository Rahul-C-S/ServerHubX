import { useState, useEffect } from 'react';
import {
  Mail,
  Smartphone,
  Webhook,
  Clock,
  AlertTriangle,
  Send,
} from 'lucide-react';
import {
  Card,
  CardContent,
  Button,
  Input,
  Select,
  Alert,
  Spinner,
  Badge,
} from '@/components/ui';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useTestNotificationChannel,
} from '@/hooks';
import type { NotificationPreferences } from '@/types';

interface ChannelToggleProps {
  icon: typeof Mail;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  onTest?: () => void;
  isTestLoading?: boolean;
  children?: React.ReactNode;
}

function ChannelToggle({
  icon: Icon,
  title,
  description,
  enabled,
  onToggle,
  onTest,
  isTestLoading,
  children,
}: ChannelToggleProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                enabled
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'bg-surface-100 dark:bg-surface-800 text-surface-400'
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium text-surface-900 dark:text-surface-100">
                {title}
              </h3>
              <p className="text-sm text-surface-500">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onTest && enabled && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onTest}
                isLoading={isTestLoading}
              >
                <Send className="w-3 h-3 mr-1" />
                Test
              </Button>
            )}
            <button
              onClick={onToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                enabled ? 'bg-primary-600' : 'bg-surface-300 dark:bg-surface-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
        {enabled && children && <div className="mt-4 ml-13">{children}</div>}
      </CardContent>
    </Card>
  );
}

export function NotificationsTab() {
  const { data: prefs, isLoading, error } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();
  const testChannel = useTestNotificationChannel();

  const [localPrefs, setLocalPrefs] = useState<Partial<NotificationPreferences>>({});
  const [testResult, setTestResult] = useState<{ channel: string; success: boolean; error?: string } | null>(null);

  useEffect(() => {
    if (prefs) {
      setLocalPrefs(prefs);
    }
  }, [prefs]);

  const updateField = async <K extends keyof NotificationPreferences>(
    field: K,
    value: NotificationPreferences[K]
  ) => {
    setLocalPrefs((prev) => ({ ...prev, [field]: value }));
    await updatePrefs.mutateAsync({ [field]: value });
  };

  const updateConfig = async <K extends keyof NotificationPreferences>(
    field: K,
    configKey: string,
    value: unknown
  ) => {
    const currentConfig = (localPrefs[field] as Record<string, unknown>) || {};
    const newConfig = { ...currentConfig, [configKey]: value };
    setLocalPrefs((prev) => ({ ...prev, [field]: newConfig }));
    await updatePrefs.mutateAsync({ [field]: newConfig });
  };

  const handleTest = async (channel: 'email' | 'sms' | 'webhook') => {
    try {
      const result = await testChannel.mutateAsync(channel);
      setTestResult({ channel, success: result.success, error: result.error });
      setTimeout(() => setTestResult(null), 5000);
    } catch (err) {
      setTestResult({ channel, success: false, error: 'Test failed' });
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
    return <Alert variant="error">Failed to load notification preferences.</Alert>;
  }

  return (
    <div className="space-y-6">
      {testResult && (
        <Alert variant={testResult.success ? 'success' : 'error'}>
          {testResult.success
            ? `Test ${testResult.channel} notification sent successfully!`
            : `Failed to send test: ${testResult.error}`}
        </Alert>
      )}

      {/* Channels */}
      <div>
        <h2 className="text-lg font-medium text-surface-900 dark:text-surface-100 mb-4">
          Notification Channels
        </h2>
        <div className="space-y-4">
          <ChannelToggle
            icon={Mail}
            title="Email Notifications"
            description="Receive alerts via email"
            enabled={localPrefs.emailEnabled || false}
            onToggle={() => updateField('emailEnabled', !localPrefs.emailEnabled)}
            onTest={() => handleTest('email')}
            isTestLoading={testChannel.isPending}
          >
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={localPrefs.emailConfig?.address || ''}
                  onChange={(e) => updateConfig('emailConfig', 'address', e.target.value)}
                  placeholder="your@email.com"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={localPrefs.emailConfig?.digestMode || false}
                    onChange={(e) => updateConfig('emailConfig', 'digestMode', e.target.checked)}
                    className="rounded border-surface-300"
                  />
                  <span className="text-sm text-surface-700 dark:text-surface-300">
                    Digest mode
                  </span>
                </label>
                {localPrefs.emailConfig?.digestMode && (
                  <Select
                    value={localPrefs.emailConfig?.digestFrequency || 'daily'}
                    onChange={(e) =>
                      updateConfig('emailConfig', 'digestFrequency', e.target.value)
                    }
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </Select>
                )}
              </div>
            </div>
          </ChannelToggle>

          <ChannelToggle
            icon={Smartphone}
            title="SMS Notifications"
            description="Receive alerts via text message"
            enabled={localPrefs.smsEnabled || false}
            onToggle={() => updateField('smsEnabled', !localPrefs.smsEnabled)}
            onTest={() => handleTest('sms')}
            isTestLoading={testChannel.isPending}
          >
            <div className="flex gap-3">
              <div className="w-24">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Country
                </label>
                <Input
                  value={localPrefs.smsConfig?.countryCode || '+1'}
                  onChange={(e) => updateConfig('smsConfig', 'countryCode', e.target.value)}
                  placeholder="+1"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  value={localPrefs.smsConfig?.phoneNumber || ''}
                  onChange={(e) => updateConfig('smsConfig', 'phoneNumber', e.target.value)}
                  placeholder="555-123-4567"
                />
              </div>
            </div>
          </ChannelToggle>

          <ChannelToggle
            icon={Webhook}
            title="Webhook Notifications"
            description="Send alerts to a custom webhook URL"
            enabled={localPrefs.webhookEnabled || false}
            onToggle={() => updateField('webhookEnabled', !localPrefs.webhookEnabled)}
            onTest={() => handleTest('webhook')}
            isTestLoading={testChannel.isPending}
          >
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Webhook URL
                </label>
                <Input
                  type="url"
                  value={localPrefs.webhookConfig?.url || ''}
                  onChange={(e) => updateConfig('webhookConfig', 'url', e.target.value)}
                  placeholder="https://your-server.com/webhook"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Format
                </label>
                <Select
                  value={localPrefs.webhookConfig?.format || 'json'}
                  onChange={(e) => updateConfig('webhookConfig', 'format', e.target.value)}
                >
                  <option value="json">JSON</option>
                  <option value="slack">Slack</option>
                  <option value="discord">Discord</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Secret (Optional)
                </label>
                <Input
                  type="password"
                  value={localPrefs.webhookConfig?.secret || ''}
                  onChange={(e) => updateConfig('webhookConfig', 'secret', e.target.value)}
                  placeholder="webhook-secret"
                />
              </div>
            </div>
          </ChannelToggle>
        </div>
      </div>

      {/* Severity Filters */}
      <div>
        <h2 className="text-lg font-medium text-surface-900 dark:text-surface-100 mb-4">
          <AlertTriangle className="w-5 h-5 inline mr-2" />
          Severity Filters
        </h2>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-surface-500 mb-4">
              Choose which alert severities you want to be notified about
            </p>
            <div className="flex gap-4">
              {(['info', 'warning', 'critical'] as const).map((severity) => (
                <label key={severity} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={localPrefs.severityFilters?.[severity] !== false}
                    onChange={(e) => {
                      const current = localPrefs.severityFilters || {};
                      updateField('severityFilters', {
                        ...current,
                        [severity]: e.target.checked,
                      });
                    }}
                    className="rounded border-surface-300"
                  />
                  <Badge
                    variant={
                      severity === 'critical'
                        ? 'danger'
                        : severity === 'warning'
                        ? 'warning'
                        : 'default'
                    }
                  >
                    {severity}
                  </Badge>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quiet Hours */}
      <div>
        <h2 className="text-lg font-medium text-surface-900 dark:text-surface-100 mb-4">
          <Clock className="w-5 h-5 inline mr-2" />
          Quiet Hours
        </h2>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium text-surface-900 dark:text-surface-100">
                  Enable Quiet Hours
                </h3>
                <p className="text-sm text-surface-500">
                  Pause non-critical notifications during specific hours
                </p>
              </div>
              <button
                onClick={() => {
                  const current = localPrefs.schedulePreferences || {};
                  updateField('schedulePreferences', {
                    ...current,
                    quietHoursEnabled: !current.quietHoursEnabled,
                  });
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  localPrefs.schedulePreferences?.quietHoursEnabled
                    ? 'bg-primary-600'
                    : 'bg-surface-300 dark:bg-surface-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    localPrefs.schedulePreferences?.quietHoursEnabled
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {localPrefs.schedulePreferences?.quietHoursEnabled && (
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Start Time
                  </label>
                  <Input
                    type="time"
                    value={localPrefs.schedulePreferences?.quietHoursStart || '22:00'}
                    onChange={(e) => {
                      const current = localPrefs.schedulePreferences || {};
                      updateField('schedulePreferences', {
                        ...current,
                        quietHoursStart: e.target.value,
                      });
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    End Time
                  </label>
                  <Input
                    type="time"
                    value={localPrefs.schedulePreferences?.quietHoursEnd || '08:00'}
                    onChange={(e) => {
                      const current = localPrefs.schedulePreferences || {};
                      updateField('schedulePreferences', {
                        ...current,
                        quietHoursEnd: e.target.value,
                      });
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Timezone
                  </label>
                  <Select
                    value={localPrefs.schedulePreferences?.quietHoursTimezone || 'UTC'}
                    onChange={(e) => {
                      const current = localPrefs.schedulePreferences || {};
                      updateField('schedulePreferences', {
                        ...current,
                        quietHoursTimezone: e.target.value,
                      });
                    }}
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="Europe/London">London</option>
                    <option value="Europe/Paris">Paris</option>
                    <option value="Asia/Tokyo">Tokyo</option>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
