import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as pty from 'node-pty';
import * as crypto from 'crypto';
import { TerminalSession, SessionStatus } from './entities/terminal-session.entity.js';
import { User } from '../users/entities/user.entity.js';

export interface PtySession {
  id: string;
  pty: pty.IPty;
  session: TerminalSession;
  user: User;
  onData: (data: string) => void;
  onExit: (exitCode: number, signal?: number) => void;
}

export interface CreateSessionOptions {
  user: User;
  username: string;
  homeDirectory: string;
  clientIp: string;
  userAgent?: string;
  cols?: number;
  rows?: number;
}

@Injectable()
export class SessionManagerService implements OnModuleDestroy {
  private readonly logger = new Logger(SessionManagerService.name);
  private readonly sessions = new Map<string, PtySession>();
  private readonly idleTimeout: number;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    @InjectRepository(TerminalSession)
    private readonly sessionRepository: Repository<TerminalSession>,
    private readonly configService: ConfigService,
  ) {
    // Default 30 minutes idle timeout
    this.idleTimeout = this.configService.get<number>('TERMINAL_IDLE_TIMEOUT', 1800) * 1000;

    // Start cleanup interval (every 5 minutes)
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleSessions();
    }, 5 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    // Cleanup all sessions on shutdown
    for (const [sessionId] of this.sessions) {
      this.destroySession(sessionId, 'Server shutdown');
    }
  }

  async createSession(
    options: CreateSessionOptions,
    onData: (data: string) => void,
    onExit: (exitCode: number, signal?: number) => void,
  ): Promise<PtySession> {
    const sessionId = this.generateSessionId();
    const cols = options.cols || 80;
    const rows = options.rows || 24;

    // Create database record
    const sessionEntity = this.sessionRepository.create({
      sessionId,
      username: options.username,
      clientIp: options.clientIp,
      userAgent: options.userAgent,
      homeDirectory: options.homeDirectory,
      userId: options.user.id,
      cols,
      rows,
      status: SessionStatus.ACTIVE,
      lastActivityAt: new Date(),
    });

    await this.sessionRepository.save(sessionEntity);

    // Determine shell
    const shell = this.getShell();

    // Set up environment
    const env = this.buildEnvironment(options.username, options.homeDirectory);

    try {
      // Create PTY process
      const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols,
        rows,
        cwd: options.homeDirectory,
        env,
        uid: undefined, // Would need root to set UID
        gid: undefined,
      });

      const session: PtySession = {
        id: sessionId,
        pty: ptyProcess,
        session: sessionEntity,
        user: options.user,
        onData,
        onExit,
      };

      // Set up event handlers
      ptyProcess.onData((data: string) => {
        this.updateActivity(sessionId);
        onData(data);
      });

      ptyProcess.onExit(({ exitCode, signal }) => {
        this.handlePtyExit(sessionId, exitCode, signal);
        onExit(exitCode, signal);
      });

      this.sessions.set(sessionId, session);

      this.logger.log(`Created terminal session ${sessionId} for user ${options.username}`);

      return session;
    } catch (error) {
      // Update session status on failure
      sessionEntity.status = SessionStatus.ERROR;
      sessionEntity.endReason = (error as Error).message;
      sessionEntity.endedAt = new Date();
      await this.sessionRepository.save(sessionEntity);

      this.logger.error(`Failed to create PTY for session ${sessionId}: ${(error as Error).message}`);
      throw error;
    }
  }

  getSession(sessionId: string): PtySession | undefined {
    return this.sessions.get(sessionId);
  }

  async destroySession(sessionId: string, reason?: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      // Kill PTY process
      session.pty.kill();
    } catch (error) {
      this.logger.warn(`Error killing PTY for session ${sessionId}: ${(error as Error).message}`);
    }

    // Update database record
    try {
      session.session.status = SessionStatus.ENDED;
      session.session.endedAt = new Date();
      session.session.endReason = reason || 'Session closed';
      await this.sessionRepository.save(session.session);
    } catch (error) {
      this.logger.error(`Failed to update session record ${sessionId}: ${(error as Error).message}`);
    }

    this.sessions.delete(sessionId);
    this.logger.log(`Destroyed terminal session ${sessionId}: ${reason || 'No reason'}`);
  }

  writeToSession(sessionId: string, data: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    try {
      session.pty.write(data);
      this.updateActivity(sessionId);
      return true;
    } catch (error) {
      this.logger.error(`Failed to write to session ${sessionId}: ${(error as Error).message}`);
      return false;
    }
  }

  resizeSession(sessionId: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    try {
      session.pty.resize(cols, rows);
      session.session.cols = cols;
      session.session.rows = rows;
      // Don't await - fire and forget
      this.sessionRepository.save(session.session).catch(() => {});
      return true;
    } catch (error) {
      this.logger.error(`Failed to resize session ${sessionId}: ${(error as Error).message}`);
      return false;
    }
  }

  private async updateActivity(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.session.lastActivityAt = new Date();
    // Don't await - fire and forget
    this.sessionRepository.save(session.session).catch(() => {});
  }

  private async handlePtyExit(sessionId: string, exitCode: number, signal?: number): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.session.status = SessionStatus.ENDED;
    session.session.endedAt = new Date();
    session.session.endReason = signal
      ? `Process killed by signal ${signal}`
      : `Process exited with code ${exitCode}`;

    try {
      await this.sessionRepository.save(session.session);
    } catch (error) {
      this.logger.error(`Failed to update session on exit: ${(error as Error).message}`);
    }

    this.sessions.delete(sessionId);
    this.logger.log(`Session ${sessionId} PTY exited: code=${exitCode}, signal=${signal}`);
  }

  private async cleanupIdleSessions(): Promise<void> {
    const now = Date.now();

    for (const [sessionId, session] of this.sessions) {
      const lastActivity = session.session.lastActivityAt?.getTime() || 0;
      const idleTime = now - lastActivity;

      if (idleTime > this.idleTimeout) {
        this.logger.log(`Cleaning up idle session ${sessionId} (idle for ${Math.round(idleTime / 1000)}s)`);
        await this.destroySession(sessionId, 'Idle timeout');
      }
    }
  }

  private generateSessionId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private getShell(): string {
    // Use bash by default, fallback to sh
    return process.env.SHELL || '/bin/bash';
  }

  private buildEnvironment(username: string, homeDirectory: string): Record<string, string> {
    return {
      TERM: 'xterm-256color',
      HOME: homeDirectory,
      USER: username,
      SHELL: this.getShell(),
      PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
      LANG: 'en_US.UTF-8',
      LC_ALL: 'en_US.UTF-8',
    };
  }

  getActiveSessions(): PtySession[] {
    return Array.from(this.sessions.values());
  }

  getSessionsByUser(userId: string): PtySession[] {
    return Array.from(this.sessions.values()).filter(
      (session) => session.user.id === userId,
    );
  }

  async getSessionHistory(
    userId?: string,
    limit = 50,
    offset = 0,
  ): Promise<[TerminalSession[], number]> {
    const query = this.sessionRepository.createQueryBuilder('session')
      .orderBy('session.createdAt', 'DESC')
      .take(limit)
      .skip(offset);

    if (userId) {
      query.where('session.userId = :userId', { userId });
    }

    return query.getManyAndCount();
  }
}
