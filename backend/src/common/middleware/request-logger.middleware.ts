import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../logger/logger.service.js';

interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerService) {}

  use(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, originalUrl, ip } = req;

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;
      const userId = req.user?.id || 'anonymous';

      this.logger.logWithMeta('info', `${method} ${originalUrl}`, {
        context: 'HTTP',
        method,
        url: originalUrl,
        statusCode,
        duration: `${duration}ms`,
        ip,
        userId,
      });
    });

    next();
  }
}
