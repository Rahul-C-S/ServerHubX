import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionManagerService, PtySession, CreateSessionOptions } from './session-manager.service.js';
import { TerminalSession } from './entities/terminal-session.entity.js';
import { User } from '../users/entities/user.entity.js';
import { SystemUser, SystemUserStatus } from '../system-users/entities/system-user.entity.js';
import { Domain } from '../domains/entities/domain.entity.js';
import { UserRole } from '../users/entities/user.entity.js';

export interface TerminalAccessInfo {
  username: string;
  homeDirectory: string;
  canAccess: boolean;
  reason?: string;
}

export interface SessionInfo {
  sessionId: string;
  username: string;
  clientIp: string;
  status: string;
  cols: number;
  rows: number;
  createdAt: Date;
  lastActivityAt?: Date;
}

@Injectable()
export class TerminalService {
  private readonly logger = new Logger(TerminalService.name);

  constructor(
    private readonly sessionManager: SessionManagerService,
    @InjectRepository(SystemUser)
    private readonly systemUserRepository: Repository<SystemUser>,
    @InjectRepository(Domain)
    private readonly domainRepository: Repository<Domain>,
  ) {}

  async verifyTerminalAccess(user: User, targetUsername?: string): Promise<TerminalAccessInfo> {
    // Root admins can access any terminal
    if (user.role === UserRole.ROOT_ADMIN) {
      if (targetUsername) {
        const systemUser = await this.systemUserRepository.findOne({
          where: { username: targetUsername },
        });
        if (!systemUser) {
          return {
            username: targetUsername,
            homeDirectory: `/home/${targetUsername}`,
            canAccess: false,
            reason: 'System user not found',
          };
        }
        if (systemUser.status !== SystemUserStatus.ACTIVE) {
          return {
            username: targetUsername,
            homeDirectory: systemUser.homeDirectory,
            canAccess: false,
            reason: 'System user is suspended',
          };
        }
        return {
          username: systemUser.username,
          homeDirectory: systemUser.homeDirectory,
          canAccess: true,
        };
      }
      // Default to root's home directory
      return {
        username: 'root',
        homeDirectory: '/root',
        canAccess: true,
      };
    }

    // Resellers can access their own users' terminals
    if (user.role === UserRole.RESELLER) {
      if (targetUsername) {
        const systemUser = await this.systemUserRepository.findOne({
          where: { username: targetUsername, ownerId: user.id },
        });
        if (!systemUser) {
          return {
            username: targetUsername,
            homeDirectory: `/home/${targetUsername}`,
            canAccess: false,
            reason: 'You do not have access to this user',
          };
        }
        if (systemUser.status !== SystemUserStatus.ACTIVE) {
          return {
            username: targetUsername,
            homeDirectory: systemUser.homeDirectory,
            canAccess: false,
            reason: 'System user is suspended',
          };
        }
        return {
          username: systemUser.username,
          homeDirectory: systemUser.homeDirectory,
          canAccess: true,
        };
      }
      // Resellers default to their own home directory
      const ownSystemUser = await this.getOrCreateSystemUserForDashboardUser(user);
      return {
        username: ownSystemUser.username,
        homeDirectory: ownSystemUser.homeDirectory,
        canAccess: true,
      };
    }

    // Domain owners can only access their own terminal
    if (user.role === UserRole.DOMAIN_OWNER || user.role === UserRole.DEVELOPER) {
      // Find system user associated with this user
      const systemUser = await this.systemUserRepository.findOne({
        where: { ownerId: user.id },
      });

      if (!systemUser) {
        // Check if they have a domain with a system user
        const domain = await this.domainRepository.findOne({
          where: { ownerId: user.id },
          relations: ['systemUser'],
        });
        if (domain?.systemUser) {
          const domainSystemUser = domain.systemUser;
          if (domainSystemUser.status !== SystemUserStatus.ACTIVE) {
            return {
              username: domainSystemUser.username,
              homeDirectory: domainSystemUser.homeDirectory,
              canAccess: false,
              reason: 'System user is suspended',
            };
          }
          return {
            username: domainSystemUser.username,
            homeDirectory: domainSystemUser.homeDirectory,
            canAccess: true,
          };
        }
        return {
          username: '',
          homeDirectory: '',
          canAccess: false,
          reason: 'No system user associated with your account',
        };
      }

      // Prevent access to other users' terminals
      if (targetUsername && targetUsername !== systemUser.username) {
        return {
          username: targetUsername,
          homeDirectory: `/home/${targetUsername}`,
          canAccess: false,
          reason: 'You can only access your own terminal',
        };
      }

      if (systemUser.status !== SystemUserStatus.ACTIVE) {
        return {
          username: systemUser.username,
          homeDirectory: systemUser.homeDirectory,
          canAccess: false,
          reason: 'Your account is suspended',
        };
      }

      if (systemUser.sftpOnly) {
        return {
          username: systemUser.username,
          homeDirectory: systemUser.homeDirectory,
          canAccess: false,
          reason: 'Your account is restricted to SFTP only',
        };
      }

      return {
        username: systemUser.username,
        homeDirectory: systemUser.homeDirectory,
        canAccess: true,
      };
    }

    return {
      username: '',
      homeDirectory: '',
      canAccess: false,
      reason: 'Insufficient permissions',
    };
  }

  async createTerminalSession(
    user: User,
    clientIp: string,
    userAgent?: string,
    targetUsername?: string,
    cols?: number,
    rows?: number,
    onData?: (data: string) => void,
    onExit?: (exitCode: number, signal?: number) => void,
  ): Promise<PtySession> {
    const accessInfo = await this.verifyTerminalAccess(user, targetUsername);

    if (!accessInfo.canAccess) {
      throw new ForbiddenException(accessInfo.reason || 'Terminal access denied');
    }

    const options: CreateSessionOptions = {
      user,
      username: accessInfo.username,
      homeDirectory: accessInfo.homeDirectory,
      clientIp,
      userAgent,
      cols,
      rows,
    };

    const session = await this.sessionManager.createSession(
      options,
      onData || (() => {}),
      onExit || (() => {}),
    );

    this.logger.log(
      `Terminal session created: ${session.id} for user ${accessInfo.username} by ${user.email}`,
    );

    return session;
  }

  getSession(sessionId: string): PtySession | undefined {
    return this.sessionManager.getSession(sessionId);
  }

  async destroySession(sessionId: string, userId: string, reason?: string): Promise<void> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Verify the user owns this session or is admin
    if (session.user.id !== userId && session.user.role !== UserRole.ROOT_ADMIN) {
      throw new ForbiddenException('You cannot terminate this session');
    }

    await this.sessionManager.destroySession(sessionId, reason);
  }

  writeToSession(sessionId: string, userId: string, data: string): boolean {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      return false;
    }

    // Verify the user owns this session
    if (session.user.id !== userId) {
      return false;
    }

    return this.sessionManager.writeToSession(sessionId, data);
  }

  resizeSession(sessionId: string, userId: string, cols: number, rows: number): boolean {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      return false;
    }

    // Verify the user owns this session
    if (session.user.id !== userId) {
      return false;
    }

    return this.sessionManager.resizeSession(sessionId, cols, rows);
  }

  getActiveSessionsForUser(userId: string): SessionInfo[] {
    const sessions = this.sessionManager.getSessionsByUser(userId);
    return sessions.map((s) => ({
      sessionId: s.id,
      username: s.session.username,
      clientIp: s.session.clientIp,
      status: s.session.status,
      cols: s.session.cols,
      rows: s.session.rows,
      createdAt: s.session.createdAt,
      lastActivityAt: s.session.lastActivityAt,
    }));
  }

  async getAllActiveSessions(user: User): Promise<SessionInfo[]> {
    if (user.role !== UserRole.ROOT_ADMIN) {
      throw new ForbiddenException('Only administrators can view all sessions');
    }

    const sessions = this.sessionManager.getActiveSessions();
    return sessions.map((s) => ({
      sessionId: s.id,
      username: s.session.username,
      clientIp: s.session.clientIp,
      status: s.session.status,
      cols: s.session.cols,
      rows: s.session.rows,
      createdAt: s.session.createdAt,
      lastActivityAt: s.session.lastActivityAt,
    }));
  }

  async getSessionHistory(
    user: User,
    limit = 50,
    offset = 0,
  ): Promise<{ sessions: TerminalSession[]; total: number }> {
    let userId: string | undefined;

    // Non-admins can only see their own history
    if (user.role !== UserRole.ROOT_ADMIN) {
      userId = user.id;
    }

    const [sessions, total] = await this.sessionManager.getSessionHistory(userId, limit, offset);
    return { sessions, total };
  }

  async terminateUserSessions(adminUser: User, targetUserId: string, reason?: string): Promise<number> {
    if (adminUser.role !== UserRole.ROOT_ADMIN) {
      throw new ForbiddenException('Only administrators can terminate user sessions');
    }

    const sessions = this.sessionManager.getSessionsByUser(targetUserId);
    let terminated = 0;

    for (const session of sessions) {
      await this.sessionManager.destroySession(
        session.id,
        reason || `Terminated by administrator ${adminUser.email}`,
      );
      terminated++;
    }

    this.logger.log(
      `Admin ${adminUser.email} terminated ${terminated} sessions for user ${targetUserId}`,
    );

    return terminated;
  }

  private async getOrCreateSystemUserForDashboardUser(user: User): Promise<SystemUser> {
    // Check if user already has a system user
    const existingSystemUser = await this.systemUserRepository.findOne({
      where: { ownerId: user.id },
    });

    if (existingSystemUser) {
      return existingSystemUser;
    }

    // For resellers, check if they have a domain with a system user
    const domain = await this.domainRepository.findOne({
      where: { ownerId: user.id },
      relations: ['systemUser'],
    });

    if (domain?.systemUser) {
      return domain.systemUser;
    }

    throw new BadRequestException('No system user found for your account');
  }
}
