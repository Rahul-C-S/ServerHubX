export type SessionStatus = 'ACTIVE' | 'ENDED' | 'DISCONNECTED' | 'ERROR';

export interface TerminalSession {
  sessionId: string;
  username: string;
  clientIp: string;
  status: SessionStatus;
  cols: number;
  rows: number;
  createdAt: string;
  lastActivityAt?: string;
}

export interface TerminalStartPayload {
  targetUsername?: string;
  cols?: number;
  rows?: number;
}

export interface TerminalInputPayload {
  sessionId: string;
  data: string;
}

export interface TerminalResizePayload {
  sessionId: string;
  cols: number;
  rows: number;
}

export interface TerminalStartedEvent {
  sessionId: string;
  username: string;
  cols: number;
  rows: number;
}

export interface TerminalOutputEvent {
  sessionId: string;
  data: string;
}

export interface TerminalExitEvent {
  sessionId: string;
  exitCode: number;
  signal?: number;
}

export interface TerminalResizedEvent {
  sessionId: string;
  cols: number;
  rows: number;
}

export interface TerminalErrorEvent {
  message: string;
  sessionId?: string;
}
