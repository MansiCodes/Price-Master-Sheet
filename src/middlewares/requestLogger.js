import morgan from 'morgan';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * HTTP request logging via morgan, piped into Winston.
 */
export const requestLogger = morgan(env.isDevelopment ? 'dev' : 'combined', {
  stream: {
    write: (message) => {
      logger.info(message.trim());
    },
  },
  skip: (req) => req.url === '/api/v1/health',
});
