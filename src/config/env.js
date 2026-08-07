import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';
import { SHEET_NAME } from '../constants/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(projectRoot, '.env') });

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  GOOGLE_SHEET_ID: z.string().min(1, 'GOOGLE_SHEET_ID is required'),
  GOOGLE_SHEET_NAME: z.string().default(SHEET_NAME),
  GOOGLE_SERVICE_ACCOUNT_JSON: z.string().optional().default(''),
  GOOGLE_SERVICE_ACCOUNT_JSON_PATH: z
    .string()
    .min(1)
    .default('./credentials/service-account.json'),
  CACHE_TTL: z.coerce.number().int().positive().default(300),
  CORS_ORIGIN: z.string().default('*'),
  GOOGLE_SHEETS_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),
}).superRefine((data, ctx) => {
  if (!data.GOOGLE_SERVICE_ACCOUNT_JSON && !data.GOOGLE_SERVICE_ACCOUNT_JSON_PATH) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_JSON_PATH',
      path: ['GOOGLE_SERVICE_ACCOUNT_JSON'],
    });
  }
});

/**
 * Validates and freezes environment configuration at startup.
 */
function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  const data = parsed.data;
  const credentialsPath = path.isAbsolute(data.GOOGLE_SERVICE_ACCOUNT_JSON_PATH)
    ? data.GOOGLE_SERVICE_ACCOUNT_JSON_PATH
    : path.resolve(projectRoot, data.GOOGLE_SERVICE_ACCOUNT_JSON_PATH);

  return Object.freeze({
    port: data.PORT,
    nodeEnv: data.NODE_ENV,
    isProduction: data.NODE_ENV === 'production',
    isDevelopment: data.NODE_ENV === 'development',
    googleSheetId: data.GOOGLE_SHEET_ID,
    googleSheetName: data.GOOGLE_SHEET_NAME.trim() || SHEET_NAME,
    googleServiceAccountJson: data.GOOGLE_SERVICE_ACCOUNT_JSON || '',
    googleServiceAccountJsonPath: credentialsPath,
    cacheTtlSeconds: data.CACHE_TTL,
    corsOrigin: data.CORS_ORIGIN,
    googleSheetsTimeoutMs: data.GOOGLE_SHEETS_TIMEOUT_MS,
    rateLimitWindowMs: data.RATE_LIMIT_WINDOW_MS,
    rateLimitMax: data.RATE_LIMIT_MAX,
    logLevel: data.LOG_LEVEL,
    projectRoot,
  });
}

export const env = loadEnv();
