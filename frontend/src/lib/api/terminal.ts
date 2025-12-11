import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import type {
  TerminalStartPayload,
  TerminalStartedEvent,
  TerminalOutputEvent,
  TerminalExitEvent,
  TerminalResizedEvent,
  TerminalErrorEvent,
  TerminalSession,
} from '@/types';
import { apiClient } from './client';

const WS_BASE_URL = import.meta.env.VITE_WS_URL || window.location.origin;

export interface TerminalSocketCallbacks {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onStarted?: (event: TerminalStartedEvent) => void;
  onOutput?: (event: TerminalOutputEvent) => void;
  onExit?: (event: TerminalExitEvent) => void;
  onResized?: (event: TerminalResizedEvent) => void;
  onError?: (event: TerminalErrorEvent) => void;
}

export function createTerminalSocket(callbacks: TerminalSocketCallbacks): Socket {
  const token = useAuthStore.getState().accessToken;

  const socket = io(`${WS_BASE_URL}/terminal`, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    callbacks.onConnected?.();
  });

  socket.on('disconnect', () => {
    callbacks.onDisconnected?.();
  });

  socket.on('connected', () => {
    callbacks.onConnected?.();
  });

  socket.on('terminal:started', (event: TerminalStartedEvent) => {
    callbacks.onStarted?.(event);
  });

  socket.on('terminal:output', (event: TerminalOutputEvent) => {
    callbacks.onOutput?.(event);
  });

  socket.on('terminal:exit', (event: TerminalExitEvent) => {
    callbacks.onExit?.(event);
  });

  socket.on('terminal:resized', (event: TerminalResizedEvent) => {
    callbacks.onResized?.(event);
  });

  socket.on('terminal:error', (event: TerminalErrorEvent) => {
    callbacks.onError?.(event);
  });

  socket.on('error', (error: { message: string }) => {
    callbacks.onError?.({ message: error.message });
  });

  return socket;
}

export function startTerminal(socket: Socket, payload: TerminalStartPayload): void {
  socket.emit('terminal:start', payload);
}

export function sendTerminalInput(socket: Socket, sessionId: string, data: string): void {
  socket.emit('terminal:input', { sessionId, data });
}

export function resizeTerminal(socket: Socket, sessionId: string, cols: number, rows: number): void {
  socket.emit('terminal:resize', { sessionId, cols, rows });
}

export function stopTerminal(socket: Socket, sessionId?: string): void {
  socket.emit('terminal:stop', { sessionId });
}

export function pingTerminal(socket: Socket): void {
  socket.emit('terminal:ping');
}

export async function getActiveSessions(): Promise<TerminalSession[]> {
  const response = await apiClient.get<{ sessions: TerminalSession[] }>('/terminal/sessions');
  return response.data.sessions;
}

export async function getSessionHistory(
  limit = 50,
  offset = 0
): Promise<{ sessions: TerminalSession[]; total: number }> {
  const response = await apiClient.get<{ sessions: TerminalSession[]; total: number }>(
    '/terminal/sessions/history',
    { params: { limit, offset } }
  );
  return response.data;
}
