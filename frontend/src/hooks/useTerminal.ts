import { useCallback, useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import {
  createTerminalSocket,
  startTerminal,
  sendTerminalInput,
  resizeTerminal,
  stopTerminal,
} from '@/lib/api/terminal';
import type {
  TerminalStartedEvent,
  TerminalOutputEvent,
  TerminalExitEvent,
  TerminalErrorEvent,
} from '@/types';

export type TerminalStatus = 'disconnected' | 'connecting' | 'connected' | 'active' | 'ended' | 'error';

export interface UseTerminalOptions {
  targetUsername?: string;
  cols?: number;
  rows?: number;
  onOutput?: (data: string) => void;
  onStatusChange?: (status: TerminalStatus) => void;
  onExit?: (exitCode: number, signal?: number) => void;
  onError?: (message: string) => void;
}

export interface UseTerminalReturn {
  status: TerminalStatus;
  sessionId: string | null;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
}

export function useTerminal(options: UseTerminalOptions = {}): UseTerminalReturn {
  const [status, setStatus] = useState<TerminalStatus>('disconnected');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const optionsRef = useRef(options);

  // Keep options ref up to date
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const updateStatus = useCallback((newStatus: TerminalStatus) => {
    setStatus(newStatus);
    optionsRef.current.onStatusChange?.(newStatus);
  }, []);

  const handleStarted = useCallback((event: TerminalStartedEvent) => {
    setSessionId(event.sessionId);
    updateStatus('active');
  }, [updateStatus]);

  const handleOutput = useCallback((event: TerminalOutputEvent) => {
    optionsRef.current.onOutput?.(event.data);
  }, []);

  const handleExit = useCallback((event: TerminalExitEvent) => {
    updateStatus('ended');
    optionsRef.current.onExit?.(event.exitCode, event.signal);
  }, [updateStatus]);

  const handleError = useCallback((event: TerminalErrorEvent) => {
    setError(event.message);
    updateStatus('error');
    optionsRef.current.onError?.(event.message);
  }, [updateStatus]);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    setError(null);
    updateStatus('connecting');

    socketRef.current = createTerminalSocket({
      onConnected: () => {
        updateStatus('connected');
        // Start terminal session once connected
        if (socketRef.current) {
          startTerminal(socketRef.current, {
            targetUsername: optionsRef.current.targetUsername,
            cols: optionsRef.current.cols || 80,
            rows: optionsRef.current.rows || 24,
          });
        }
      },
      onDisconnected: () => {
        updateStatus('disconnected');
        setSessionId(null);
      },
      onStarted: handleStarted,
      onOutput: handleOutput,
      onExit: handleExit,
      onError: handleError,
    });
  }, [updateStatus, handleStarted, handleOutput, handleExit, handleError]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      if (sessionId) {
        stopTerminal(socketRef.current, sessionId);
      }
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setSessionId(null);
    updateStatus('disconnected');
  }, [sessionId, updateStatus]);

  const write = useCallback((data: string) => {
    if (socketRef.current && sessionId) {
      sendTerminalInput(socketRef.current, sessionId, data);
    }
  }, [sessionId]);

  const resize = useCallback((cols: number, rows: number) => {
    if (socketRef.current && sessionId) {
      resizeTerminal(socketRef.current, sessionId, cols, rows);
    }
  }, [sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return {
    status,
    sessionId,
    error,
    connect,
    disconnect,
    write,
    resize,
  };
}
