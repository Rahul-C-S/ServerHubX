import { useState, useEffect, useRef } from 'react';
import { FileText, Download, Trash2, Search, Filter, RefreshCw, Play, Pause } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useLogs, useLogStats, useLogFiles, useClearLogs, useDownloadLog } from '@/hooks/useLogs';
import { LogLevel, LogSource } from '@/types/logs';
import type { LogFilter, LogEntry } from '@/types/logs';

const LOG_SOURCES = [
  { value: '', label: 'All Sources' },
  { value: LogSource.SYSTEM, label: 'System' },
  { value: LogSource.APACHE, label: 'Apache' },
  { value: LogSource.PHP_FPM, label: 'PHP-FPM' },
  { value: LogSource.PM2, label: 'PM2' },
  { value: LogSource.MARIADB, label: 'MariaDB' },
  { value: LogSource.POSTFIX, label: 'Postfix' },
  { value: LogSource.DOVECOT, label: 'Dovecot' },
  { value: LogSource.BIND9, label: 'Bind9' },
  { value: LogSource.CSF, label: 'CSF Firewall' },
  { value: LogSource.AUTH, label: 'Authentication' },
];

const LOG_LEVELS = [
  { value: '', label: 'All Levels' },
  { value: LogLevel.DEBUG, label: 'Debug' },
  { value: LogLevel.INFO, label: 'Info' },
  { value: LogLevel.WARN, label: 'Warning' },
  { value: LogLevel.ERROR, label: 'Error' },
  { value: LogLevel.FATAL, label: 'Fatal' },
];

const getLevelBadgeVariant = (level: string) => {
  switch (level) {
    case LogLevel.ERROR:
    case LogLevel.FATAL:
      return 'danger';
    case LogLevel.WARN:
      return 'warning';
    case LogLevel.INFO:
      return 'info';
    case LogLevel.DEBUG:
    default:
      return 'default';
  }
};

export function LogsPage() {
  const [filter, setFilter] = useState<LogFilter>({ limit: 100 });
  const [searchTerm, setSearchTerm] = useState('');
  const [isLive, setIsLive] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const { data: logs, isLoading, refetch } = useLogs(isLive ? filter : { ...filter, limit: 500 });
  const { data: stats } = useLogStats();
  const { data: logFiles } = useLogFiles();
  const clearLogs = useClearLogs();
  const downloadLog = useDownloadLog();

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (isLive && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, isLive]);

  const filteredLogs = logs?.filter((log) => {
    if (searchTerm) {
      return (
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.source.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return true;
  });

  const handleSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter((prev) => ({
      ...prev,
      source: e.target.value as LogSource || undefined,
    }));
  };

  const handleLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter((prev) => ({
      ...prev,
      level: e.target.value as typeof LogLevel[keyof typeof LogLevel] || undefined,
    }));
  };

  const handleClearLogs = async (source: LogSource) => {
    if (confirm(`Are you sure you want to clear ${source} logs?`)) {
      await clearLogs.mutateAsync(source);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Log Viewer</h1>
          <p className="text-gray-600 dark:text-gray-400">View and search system and application logs</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isLive ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setIsLive(!isLive)}
          >
            {isLive ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
            {isLive ? 'Pause' : 'Live'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.totalEntries.toLocaleString()}</div>
              <div className="text-sm text-gray-500">Total Entries</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.errorCount}</div>
              <div className="text-sm text-gray-500">Errors</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.warnCount}</div>
              <div className="text-sm text-gray-500">Warnings</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.infoCount}</div>
              <div className="text-sm text-gray-500">Info</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-600">{stats.debugCount}</div>
              <div className="text-sm text-gray-500">Debug</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filter.source || ''}
                onChange={handleSourceChange}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
              >
                {LOG_SOURCES.map((source) => (
                  <option key={source.value} value={source.value}>
                    {source.label}
                  </option>
                ))}
              </select>
              <select
                value={filter.level || ''}
                onChange={handleLevelChange}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
              >
                {LOG_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log Files List */}
      {logFiles && logFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Log Files
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {logFiles.map((file) => (
                <div
                  key={file.path}
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{file.name}</div>
                    <div className="text-sm text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadLog.mutate(file.path)}
                      disabled={downloadLog.isPending}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleClearLogs(file.source)}
                      disabled={clearLogs.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log Viewer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Log Entries</span>
            {isLive && (
              <Badge variant="success" className="animate-pulse">
                Live
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            ref={logContainerRef}
            className="h-[500px] overflow-auto bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm"
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
              </div>
            ) : filteredLogs && filteredLogs.length > 0 ? (
              <div className="space-y-1">
                {filteredLogs.map((log: LogEntry, index: number) => (
                  <LogLine key={log.id || index} log={log} />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No log entries found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LogLine({ log }: { log: LogEntry }) {
  const timestamp = new Date(log.timestamp).toLocaleString();
  const levelColor = {
    [LogLevel.DEBUG]: 'text-gray-400',
    [LogLevel.INFO]: 'text-blue-400',
    [LogLevel.WARN]: 'text-yellow-400',
    [LogLevel.ERROR]: 'text-red-400',
    [LogLevel.FATAL]: 'text-red-600 font-bold',
  }[log.level] || 'text-gray-400';

  return (
    <div className="flex gap-2 hover:bg-gray-800 px-2 py-1 rounded">
      <span className="text-gray-500 shrink-0">{timestamp}</span>
      <Badge variant={getLevelBadgeVariant(log.level)} className="shrink-0 uppercase text-xs">
        {log.level}
      </Badge>
      <span className="text-cyan-400 shrink-0">[{log.source}]</span>
      <span className={levelColor}>{log.message}</span>
    </div>
  );
}

export default LogsPage;
