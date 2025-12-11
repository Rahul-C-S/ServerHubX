import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../logger/logger.service.js';
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
    };
}
export declare class RequestLoggerMiddleware implements NestMiddleware {
    private readonly logger;
    constructor(logger: LoggerService);
    use(req: AuthenticatedRequest, res: Response, next: NextFunction): void;
}
export {};
