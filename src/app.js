import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { buildCorsOptions } from './config/cors.js';
import { apiRateLimiter } from './config/rateLimit.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { requestLogger } from './middlewares/requestLogger.js';
import routes from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

/**
 * Builds and configures the Express application.
 * Serves the Cable Rates web UI from /public and REST APIs under /api/v1.
 */
export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "default-src": ["'self'"],
          "script-src": ["'self'"],
          "style-src": ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          "font-src": ["'self'", 'https://fonts.gstatic.com'],
          "img-src": ["'self'", 'data:'],
          "connect-src": ["'self'"],
          "object-src": ["'none'"],
          "base-uri": ["'self'"],
          "frame-ancestors": ["'self'"],
        },
      },
    }),
  );
  app.use(cors(buildCorsOptions()));
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(requestLogger);

  app.use('/api', apiRateLimiter);
  app.use(routes);

  app.use(express.static(publicDir, {
    index: 'index.html',
    maxAge: '1h',
    etag: true,
  }));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      next();
      return;
    }
    res.sendFile(path.join(publicDir, 'index.html'), (error) => {
      if (error) next(error);
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

/** Default export for Vercel Express / serverless entry detection */
const app = createApp();
export default app;
