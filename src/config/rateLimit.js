import rateLimit from 'express-rate-limit';
import { env } from './env.js';
import { HttpStatus } from '../constants/httpStatus.js';

/**
 * Global API rate limiter to protect against abuse.
 */
export const apiRateLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
  statusCode: HttpStatus.TOO_MANY_REQUESTS,
});
