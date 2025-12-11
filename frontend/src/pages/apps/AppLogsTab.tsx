import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Trash2, Download } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Spinner,
  Alert,
  Select,
} from '@/components/ui';
import { useAppLogs, useFlushAppLogs } from '@/hooks';
import type { AppType } from '@/types';

interface AppLogsTabProps {
  appId: string;
  appType: AppType;
}

export function AppLogsTab({ appId, appType }: AppLogsTabProps) {
  const [lines, setLines] = useState(100);
  const [autoScroll, setAutoScroll] = useState(true);
  const [logType, setLogType] = useState<'combined' | 'out' | 'err'>('combined');
  const logsEndRef = useRef<HTMLDivElement>(null);

  const { data: logs, isLoading, error, refetch, isFetching } = useAppLogs(appId, lines);
  const flushLogs = useFlushAppLogs();

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  const handleFlushLogs = async () => {
    if (window.confirm('Are you sure you want to flush all logs?')) {
      await flushLogs.mutateAsync(appId);
      refetch();
    }
  };

  const handleDownload = () => {
    if (!logs) return;
    const content = logs[logType] || '';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${appId}-${logType}-logs.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (appType !== 'NODEJS') {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-surface-500">
            <p>Logs are only available for Node.js applications.</p>
            <p className="text-sm mt-2">
              PHP and static apps use Apache/Nginx logs instead.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
        Failed to load logs. Please try again later.
      </Alert>
    );
  }

  const currentLogs = logs?.[logType] || '';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-medium">Application Logs</h3>
            {isFetching && <Spinner size="sm" />}
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={logType}
              onChange={(e) => setLogType(e.target.value as typeof logType)}
              className="w-32"
            >
              <option value="combined">Combined</option>
              <option value="out">Stdout</option>
              <option value="err">Stderr</option>
            </Select>

            <Select
              value={lines.toString()}
              onChange={(e) => setLines(Number(e.target.value))}
              className="w-24"
            >
              <option value="50">50 lines</option>
              <option value="100">100 lines</option>
              <option value="200">200 lines</option>
              <option value="500">500 lines</option>
            </Select>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownload}
              disabled={!currentLogs}
            >
              <Download className="w-4 h-4" />
            </Button>

            <Button
              variant="danger"
              size="sm"
              onClick={handleFlushLogs}
              isLoading={flushLogs.isPending}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            id="autoScroll"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="autoScroll" className="text-sm text-surface-600 dark:text-surface-400">
            Auto-scroll to bottom
          </label>
        </div>

        <div className="bg-surface-900 dark:bg-black rounded-lg p-4 h-[500px] overflow-auto font-mono text-sm">
          {currentLogs ? (
            <pre className="text-green-400 whitespace-pre-wrap break-words">
              {currentLogs}
            </pre>
          ) : (
            <p className="text-surface-500 text-center py-8">No logs available</p>
          )}
          <div ref={logsEndRef} />
        </div>
      </CardContent>
    </Card>
  );
}
