import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TerminalSession } from './entities/terminal-session.entity.js';
import { SessionManagerService } from './session-manager.service.js';
import { TerminalService } from './terminal.service.js';
import { TerminalGateway } from './terminal.gateway.js';
import { WsJwtGuard } from './guards/ws-jwt.guard.js';
import { SystemUser } from '../system-users/entities/system-user.entity.js';
import { Domain } from '../domains/entities/domain.entity.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([TerminalSession, SystemUser, Domain]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.accessExpiry', '15m') as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
  ],
  providers: [
    SessionManagerService,
    TerminalService,
    TerminalGateway,
    WsJwtGuard,
  ],
  exports: [TerminalService, SessionManagerService],
})
export class TerminalModule {}
