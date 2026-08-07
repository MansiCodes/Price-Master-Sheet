/**
 * Operational application error with HTTP status and optional error code.
 * Used by centralized error middleware for consistent API responses.
 */
export class AppError extends Error {
  /**
   * @param {string} message
   * @param {number} statusCode
   * @param {string} [code]
   * @param {boolean} [isOperational=true]
   */
  constructor(message, statusCode, code = 'APP_ERROR', isOperational = true) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace?.(this, this.constructor);
  }
}
