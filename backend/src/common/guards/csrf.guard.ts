import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import * as crypto from 'crypto';

export const CSRF_TOKEN_HEADER = 'x-csrf-token';
export const CSRF_TOKEN_COOKIE = '_csrf';
export const SKIP_CSRF_KEY = 'skipCsrf';

/**
 * Decorator to skip CSRF validation for specific endpoints
 */
export const SkipCsrf = () => {
  return (target: object, _key?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(SKIP_CSRF_KEY, true, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(SKIP_CSRF_KEY, true, target);
    return target;
  };
};

/**
 * CSRF Guard using double-submit cookie pattern
 *
 * How it works:
 * 1. Server sets a random CSRF token in a cookie
 * 2. Client reads the cookie and sends the token in a header
 * 3. Server verifies the header matches the cookie
 *
 * This works because:
 * - Attackers can't read cookies from other domains (same-origin policy)
 * - Attackers can set cookies but can't read them to put in headers
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Skip CSRF for safe methods (GET, HEAD, OPTIONS)
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      this.ensureCsrfToken(request, response);
      return true;
    }

    // Check if handler or controller has SkipCsrf decorator
    const skipCsrf =
      this.reflector.get<boolean>(SKIP_CSRF_KEY, context.getHandler()) ||
      this.reflector.get<boolean>(SKIP_CSRF_KEY, context.getClass());

    if (skipCsrf) {
      return true;
    }

    // Validate CSRF token
    const cookieToken = request.cookies[CSRF_TOKEN_COOKIE];
    const headerToken = request.headers[CSRF_TOKEN_HEADER] as string;

    if (!cookieToken || !headerToken) {
      throw new ForbiddenException('CSRF token missing');
    }

    // Use timing-safe comparison to prevent timing attacks
    if (!this.timingSafeEqual(cookieToken, headerToken)) {
      throw new ForbiddenException('CSRF token invalid');
    }

    // Rotate token after successful validation for added security
    this.generateNewToken(response);

    return true;
  }

  private ensureCsrfToken(request: Request, response: Response): void {
    if (!request.cookies[CSRF_TOKEN_COOKIE]) {
      this.generateNewToken(response);
    }
  }

  private generateNewToken(response: Response): void {
    const token = crypto.randomBytes(32).toString('hex');
    response.cookie(CSRF_TOKEN_COOKIE, token, {
      httpOnly: false, // Must be readable by JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
  }

  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    try {
      return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch {
      return false;
    }
  }
}

/**
 * Generate a CSRF token for the client
 * Call this endpoint to get a fresh token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
