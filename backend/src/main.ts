import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { LoggerService } from './common/logger/logger.service.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const logger = app.get(LoggerService);

  // Use custom logger
  app.useLogger(logger);

  // Security headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'wss:', 'ws:'],
          fontSrc: ["'self'", 'https:', 'data:'],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Cookie parser for refresh tokens
  app.use(cookieParser());

  // CORS configuration
  app.enableCors({
    origin: configService.get<string>('APP_URL', 'http://localhost:5173'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  });

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger API Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('ServerHubX API')
    .setDescription(
      'ServerHubX is a comprehensive web-based hosting and server management dashboard. ' +
        'This API provides endpoints for managing domains, applications, databases, DNS, SSL certificates, ' +
        'email, backups, monitoring, and system administration.',
    )
    .setVersion('1.0')
    .setContact('ServerHubX', 'https://serverhubx.com', 'support@serverhubx.com')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addCookieAuth('refresh_token', {
      type: 'apiKey',
      in: 'cookie',
      name: 'refresh_token',
      description: 'Refresh token for obtaining new access tokens',
    })
    .addTag('Authentication', 'User authentication and authorization endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Domains', 'Domain and virtual host management')
    .addTag('Applications', 'Node.js and PHP application management')
    .addTag('Databases', 'MySQL and PostgreSQL database management')
    .addTag('DNS', 'DNS zone and record management')
    .addTag('SSL', 'SSL certificate management with Let\'s Encrypt')
    .addTag('Mail', 'Email domain and account management')
    .addTag('Files', 'File manager operations')
    .addTag('Terminal', 'WebSocket-based terminal sessions')
    .addTag('Backups', 'Backup management for files and databases')
    .addTag('Monitoring', 'Server monitoring and alerts')
    .addTag('Cron', 'Scheduled task management')
    .addTag('Firewall', 'UFW firewall rule management')
    .addTag('System', 'System information and settings')
    .addTag('SSH', 'SSH configuration and security')
    .addTag('Logs', 'System and application logs')
    .addTag('Notifications', 'Notification preferences and channels')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'ServerHubX API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .info .title { font-size: 2em; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 3,
    },
  });

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  logger.log(`Application running on port ${port}`, 'Bootstrap');
  logger.log(`Swagger documentation available at http://localhost:${port}/api/docs`, 'Bootstrap');
}

bootstrap();
