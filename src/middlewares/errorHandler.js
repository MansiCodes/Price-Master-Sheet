import { env } from '../config/env.js';
import { HttpStatus } from '../constants/httpStatus.js';
import { Messages } from '../constants/messages.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { sendError } from '../utils/responseFormatter.js';

/**
 * 404 handler for unmatched routes.
 */
export function notFoundHandler(req, res, _next) {
  return sendError(res, {
    statusCode: HttpStatus.NOT_FOUND,
    message: `${Messages.ROUTE_NOT_FOUND}: ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Centralized error handling middleware.
 * Maps operational AppErrors and unexpected failures to the standard error envelope.
 */
export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, {
        code: err.code,
        path: req.originalUrl,
        method: req.method,
        stack: err.stack,
      });
    } else {
      logger.warn(err.message, {
        code: err.code,
        path: req.originalUrl,
        method: req.method,
      });
    }

    return sendError(res, {
      statusCode: err.statusCode,
      message: err.message,
    });
  }

  // CORS errors from cors package
  if (err?.message?.startsWith('CORS blocked')) {
    return sendError(res, {
      statusCode: HttpStatus.FORBIDDEN,
      message: err.message,
    });
  }

  logger.error('Unhandled error', {
    message: err?.message,
    stack: err?.stack,
    path: req.originalUrl,
    method: req.method,
  });

  return sendError(res, {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    message: env.isProduction ? Messages.INTERNAL_ERROR : (err?.message || Messages.INTERNAL_ERROR),
  });
}
