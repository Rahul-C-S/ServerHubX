import type { TerminalStatus } from '@/hooks/useTerminal';
import { Badge, Button } from '@/components/ui';

interface TerminalToolbarProps {
  status: TerminalStatus;
  sessionId: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onReconnect: () => void;
}

const statusColors: Record<TerminalStatus, 'default' | 'success' | 'warning' | 'danger'> = {
  disconnected: 'default',
  connecting: 'warning',
  connected: 'success',
  active: 'success',
  ended: 'default',
  error: 'danger',
};

const statusLabels: Record<TerminalStatus, string> = {
  disconnected: 'Disconnected',
  connecting: 'Connecting...',
  connected: 'Connected',
  active: 'Active',
  ended: 'Ended',
  error: 'Error',
};

export function TerminalToolbar({
  status,
  sessionId,
  onConnect,
  onDisconnect,
  onReconnect,
}: TerminalToolbarProps) {
  const isConnected = status === 'connected' || status === 'active';
  const canConnect = status === 'disconnected' || status === 'ended' || status === 'error';

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
      <div className="flex items-center gap-4">
        <h2 className="text-white font-medium">Terminal</h2>
        <Badge variant={statusColors[status]}>{statusLabels[status]}</Badge>
        {sessionId && (
          <span className="text-gray-500 text-xs font-mono">
            {sessionId.slice(0, 8)}...
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {canConnect && (
          <Button variant="primary" size="sm" onClick={onConnect}>
            Connect
          </Button>
        )}
        {isConnected && (
          <Button variant="secondary" size="sm" onClick={onDisconnect}>
            Disconnect
          </Button>
        )}
        {(status === 'ended' || status === 'error') && (
          <Button variant="secondary" size="sm" onClick={onReconnect}>
            Reconnect
          </Button>
        )}
      </div>
    </div>
  );
}

export default TerminalToolbar;
