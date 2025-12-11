import { useCallback, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { useTerminal } from '@/hooks/useTerminal';
import { Terminal } from './Terminal';
import { TerminalToolbar } from './TerminalToolbar';
import { Card } from '@/components/ui';

export function TerminalPage() {
  const xtermRef = useRef<XTerm | null>(null);

  const handleOutput = useCallback((data: string) => {
    xtermRef.current?.write(data);
  }, []);

  const handleStatusChange = useCallback(() => {
    // Status change handling if needed
  }, []);

  const handleExit = useCallback((exitCode: number, signal?: number) => {
    xtermRef.current?.writeln(
      `\r\n\x1b[33mProcess exited with code ${exitCode}${signal ? `, signal ${signal}` : ''}\x1b[0m`
    );
  }, []);

  const handleError = useCallback((message: string) => {
    xtermRef.current?.writeln(`\r\n\x1b[31mError: ${message}\x1b[0m`);
  }, []);

  const { status, sessionId, connect, disconnect, write, resize } = useTerminal({
    onOutput: handleOutput,
    onStatusChange: handleStatusChange,
    onExit: handleExit,
    onError: handleError,
  });

  const handleData = useCallback(
    (data: string) => {
      write(data);
    },
    [write]
  );

  const handleResize = useCallback(
    (cols: number, rows: number) => {
      resize(cols, rows);
    },
    [resize]
  );

  const handleTerminalReady = useCallback((terminal: XTerm) => {
    xtermRef.current = terminal;
  }, []);

  const handleReconnect = useCallback(() => {
    xtermRef.current?.clear();
    connect();
  }, [connect]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Web Terminal
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Secure SSH terminal access to your server
        </p>
      </div>

      <Card className="overflow-hidden">
        <TerminalToolbar
          status={status}
          sessionId={sessionId}
          onConnect={connect}
          onDisconnect={disconnect}
          onReconnect={handleReconnect}
        />
        <div className="h-[600px]">
          <Terminal
            onData={handleData}
            onResize={handleResize}
            onReady={handleTerminalReady}
          />
        </div>
      </Card>
    </div>
  );
}

export default TerminalPage;
