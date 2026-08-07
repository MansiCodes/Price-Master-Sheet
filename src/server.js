import app from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const server = app.listen(env.port, () => {
  logger.info('Cable Rates API started', {
    port: env.port,
    environment: env.nodeEnv,
    cacheTtlSeconds: env.cacheTtlSeconds,
  });
});

/**
 * Graceful shutdown for production deployments.
 * @param {string} signal
 */
function shutdown(signal) {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close((error) => {
    if (error) {
      logger.error('Error during server shutdown', { error: error.message });
      process.exit(1);
    }
    logger.info('HTTP server closed');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    message: error.message,
    stack: error.stack,
  });
  shutdown('uncaughtException');
});
