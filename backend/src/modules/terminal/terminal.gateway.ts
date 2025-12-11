import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TerminalService } from './terminal.service.js';
import { UsersService } from '../users/users.service.js';
import { User } from '../users/entities/user.entity.js';

interface AuthenticatedSocket extends Socket {
  user?: User;
  sessionId?: string;
}

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

interface TerminalStartPayload {
  targetUsername?: string;
  cols?: number;
  rows?: number;
}

interface TerminalInputPayload {
  sessionId: string;
  data: string;
}

interface TerminalResizePayload {
  sessionId: string;
  cols: number;
  rows: number;
}

@WebSocketGateway({
  namespace: '/terminal',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class TerminalGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(TerminalGateway.name);
  private readonly socketSessions = new Map<string, string>(); // socketId -> sessionId

  constructor(
    private readonly terminalService: TerminalService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  afterInit(): void {
    this.logger.log('Terminal WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const user = await this.authenticateClient(client);
      if (!user) {
        this.logger.warn(`Unauthenticated connection attempt from ${client.id}`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      client.user = user;
      this.logger.log(`Client connected: ${client.id} (${user.email})`);
      client.emit('connected', { message: 'Connected to terminal server' });
    } catch (error) {
      this.logger.warn(`Connection failed: ${(error as Error).message}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
    const sessionId = this.socketSessions.get(client.id);

    if (sessionId && client.user) {
      try {
        await this.terminalService.destroySession(
          sessionId,
          client.user.id,
          'Client disconnected',
        );
      } catch (error) {
        this.logger.warn(`Error destroying session on disconnect: ${(error as Error).message}`);
      }
    }

    this.socketSessions.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('terminal:start')
  async handleTerminalStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: TerminalStartPayload,
  ): Promise<void> {
    if (!client.user) {
      throw new WsException('Not authenticated');
    }

    // Check if client already has an active session
    const existingSessionId = this.socketSessions.get(client.id);
    if (existingSessionId) {
      const existingSession = this.terminalService.getSession(existingSessionId);
      if (existingSession) {
        client.emit('terminal:error', {
          message: 'Session already active. Close existing session first.',
          sessionId: existingSessionId,
        });
        return;
      }
      // Session doesn't exist anymore, clean up
      this.socketSessions.delete(client.id);
    }

    try {
      const clientIp = this.getClientIp(client);
      const userAgent = client.handshake?.headers?.['user-agent'];

      const session = await this.terminalService.createTerminalSession(
        client.user,
        clientIp,
        userAgent,
        payload.targetUsername,
        payload.cols || 80,
        payload.rows || 24,
        // onData callback
        (data: string) => {
          client.emit('terminal:output', { sessionId: session.id, data });
        },
        // onExit callback
        (exitCode: number, signal?: number) => {
          client.emit('terminal:exit', {
            sessionId: session.id,
            exitCode,
            signal,
          });
          this.socketSessions.delete(client.id);
        },
      );

      this.socketSessions.set(client.id, session.id);
      client.sessionId = session.id;

      client.emit('terminal:started', {
        sessionId: session.id,
        username: session.session.username,
        cols: session.session.cols,
        rows: session.session.rows,
      });

      this.logger.log(
        `Terminal session started: ${session.id} for ${client.user.email}`,
      );
    } catch (error) {
      this.logger.error(`Failed to start terminal: ${(error as Error).message}`);
      client.emit('terminal:error', {
        message: (error as Error).message || 'Failed to start terminal session',
      });
    }
  }

  @SubscribeMessage('terminal:input')
  handleTerminalInput(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: TerminalInputPayload,
  ): void {
    if (!client.user) {
      throw new WsException('Not authenticated');
    }

    const sessionId = payload.sessionId || this.socketSessions.get(client.id);
    if (!sessionId) {
      client.emit('terminal:error', { message: 'No active session' });
      return;
    }

    const success = this.terminalService.writeToSession(
      sessionId,
      client.user.id,
      payload.data,
    );

    if (!success) {
      client.emit('terminal:error', { message: 'Failed to write to terminal' });
    }
  }

  @SubscribeMessage('terminal:resize')
  handleTerminalResize(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: TerminalResizePayload,
  ): void {
    if (!client.user) {
      throw new WsException('Not authenticated');
    }

    const sessionId = payload.sessionId || this.socketSessions.get(client.id);
    if (!sessionId) {
      client.emit('terminal:error', { message: 'No active session' });
      return;
    }

    const success = this.terminalService.resizeSession(
      sessionId,
      client.user.id,
      payload.cols,
      payload.rows,
    );

    if (success) {
      client.emit('terminal:resized', {
        sessionId,
        cols: payload.cols,
        rows: payload.rows,
      });
    }
  }

  @SubscribeMessage('terminal:stop')
  async handleTerminalStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { sessionId?: string },
  ): Promise<void> {
    if (!client.user) {
      throw new WsException('Not authenticated');
    }

    const sessionId = payload.sessionId || this.socketSessions.get(client.id);
    if (!sessionId) {
      client.emit('terminal:error', { message: 'No active session' });
      return;
    }

    try {
      await this.terminalService.destroySession(
        sessionId,
        client.user.id,
        'User requested termination',
      );

      this.socketSessions.delete(client.id);
      client.emit('terminal:stopped', { sessionId });
    } catch (error) {
      client.emit('terminal:error', {
        message: (error as Error).message || 'Failed to stop terminal',
      });
    }
  }

  @SubscribeMessage('terminal:ping')
  handlePing(
    @ConnectedSocket() client: AuthenticatedSocket,
  ): void {
    client.emit('terminal:pong', { timestamp: Date.now() });
  }

  private async authenticateClient(client: Socket): Promise<User | null> {
    const token = this.extractToken(client);
    if (!token) {
      return null;
    }

    try {
      const secret = this.configService.get<string>('jwt.secret');
      const payload = this.jwtService.verify<JwtPayload>(token, { secret });
      const user = await this.usersService.findById(payload.sub);

      if (!user || !user.isActive || user.isLocked()) {
        return null;
      }

      return user;
    } catch {
      return null;
    }
  }

  private extractToken(client: Socket): string | null {
    // Try to get token from handshake auth
    const authToken = client.handshake?.auth?.token;
    if (authToken) {
      return authToken;
    }

    // Try to get token from handshake headers
    const authHeader = client.handshake?.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try to get token from query string
    const queryToken = client.handshake?.query?.token;
    if (queryToken && typeof queryToken === 'string') {
      return queryToken;
    }

    return null;
  }

  private getClientIp(client: Socket): string {
    const forwarded = client.handshake?.headers?.['x-forwarded-for'];
    if (forwarded && typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return client.handshake?.address || 'unknown';
  }
}
