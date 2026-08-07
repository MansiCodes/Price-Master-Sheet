import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import winston from 'winston';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logsDir = path.resolve(__dirname, '../logs');
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

const { combine, timestamp, printf, errors, colorize, json } = winston.format;

const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaKeys = Object.keys(meta).filter((k) => k !== 'service');
    const metaStr = metaKeys.length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return stack
      ? `${ts} [${level}]: ${message}${metaStr}\n${stack}`
      : `${ts} [${level}]: ${message}${metaStr}`;
  }),
);

const fileFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  json(),
);

/** @type {import('winston').transport[]} */
const transports = [];

if (!isServerless) {
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        format: fileFormat,
        maxsize: 5 * 1024 * 1024,
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: path.join(logsDir, 'info.log'),
        level: 'info',
        format: fileFormat,
        maxsize: 5 * 1024 * 1024,
        maxFiles: 5,
      }),
    );
  } catch {
    // Ignore filesystem errors on restricted hosts
  }
}

if (env.isDevelopment || env.nodeEnv === 'test') {
  transports.push(
    new winston.transports.Console({
      level: env.logLevel,
      format: consoleFormat,
    }),
  );
} else {
  transports.push(
    new winston.transports.Console({
      level: env.logLevel,
      format: fileFormat,
    }),
  );
}

/**
 * Application-wide Winston logger.
 */
export const logger = winston.createLogger({
  level: env.logLevel,
  defaultMeta: { service: 'cable-rates-api' },
  transports,
  exitOnError: false,
});
