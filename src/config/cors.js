import { env } from './env.js';

/**
 * Builds CORS options from environment configuration.
 * Supports a single origin, comma-separated list, or `*` for open access.
 */
export function buildCorsOptions() {
  const originConfig = env.corsOrigin.trim();

  if (originConfig === '*') {
    return {
      origin: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: false,
    };
  }

  const allowedOrigins = originConfig.split(',').map((o) => o.trim()).filter(Boolean);

  return {
    origin(origin, callback) {
      // Allow non-browser clients (mobile apps, curl) with no Origin header
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  };
}
