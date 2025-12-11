import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { envValidationSchema } from './config/env.validation.js';
import { databaseConfig } from './config/database.config.js';
import { redisConfig } from './config/redis.config.js';
import { jwtConfig } from './config/jwt.config.js';
import { LoggerModule } from './common/logger/logger.module.js';
import { RedisModule } from './common/redis/redis.module.js';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware.js';
import { CoreModule } from './core/core.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AuthorizationModule } from './modules/authorization/authorization.module.js';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard.js';
import { SystemUsersModule } from './modules/system-users/system-users.module';
import { DomainsModule } from './modules/domains/domains.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      load: [databaseConfig, redisConfig, jwtConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mariadb',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        synchronize: configService.get<boolean>('database.synchronize'),
        logging: configService.get<boolean>('database.logging'),
        autoLoadEntities: true,
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password') || undefined,
          db: configService.get<number>('redis.db'),
        },
      }),
      inject: [ConfigService],
    }),
    LoggerModule,
    RedisModule,
    CoreModule,
    UsersModule,
    AuthModule,
    AuthorizationModule,
    SystemUsersModule,
    DomainsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
