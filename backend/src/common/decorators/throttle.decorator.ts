import { applyDecorators } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';

/**
 * Apply strict rate limiting for authentication endpoints
 * 5 requests per minute to prevent brute force attacks
 */
export const AuthThrottle = () =>
  applyDecorators(
    Throttle({
      short: { limit: 3, ttl: 1000 }, // 3 per second
      medium: { limit: 5, ttl: 60000 }, // 5 per minute
      long: { limit: 20, ttl: 3600000 }, // 20 per hour
    }),
  );

/**
 * Apply strict rate limiting for password reset
 * Very limited to prevent enumeration attacks
 */
export const PasswordResetThrottle = () =>
  applyDecorators(
    Throttle({
      short: { limit: 1, ttl: 1000 }, // 1 per second
      medium: { limit: 3, ttl: 60000 }, // 3 per minute
      long: { limit: 10, ttl: 3600000 }, // 10 per hour
    }),
  );

/**
 * Apply relaxed rate limiting for read-heavy endpoints
 */
export const RelaxedThrottle = () =>
  applyDecorators(
    Throttle({
      short: { limit: 30, ttl: 1000 }, // 30 per second
      medium: { limit: 300, ttl: 60000 }, // 300 per minute
      long: { limit: 3000, ttl: 3600000 }, // 3000 per hour
    }),
  );

/**
 * Apply strict rate limiting for file operations
 */
export const FileOperationThrottle = () =>
  applyDecorators(
    Throttle({
      short: { limit: 5, ttl: 1000 }, // 5 per second
      medium: { limit: 30, ttl: 60000 }, // 30 per minute
      long: { limit: 500, ttl: 3600000 }, // 500 per hour
    }),
  );

/**
 * Apply strict rate limiting for system operations
 */
export const SystemOperationThrottle = () =>
  applyDecorators(
    Throttle({
      short: { limit: 2, ttl: 1000 }, // 2 per second
      medium: { limit: 10, ttl: 60000 }, // 10 per minute
      long: { limit: 100, ttl: 3600000 }, // 100 per hour
    }),
  );

/**
 * Skip all rate limiting for this endpoint
 */
export const NoThrottle = () => applyDecorators(SkipThrottle());
