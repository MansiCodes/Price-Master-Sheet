import fs from 'node:fs/promises';
import { google } from 'googleapis';
import { googleConfig } from '../config/google.js';
import { HttpStatus } from '../constants/httpStatus.js';
import { Messages } from '../constants/messages.js';
import { AppError } from './AppError.js';
import { logger } from './logger.js';

/** @type {import('googleapis').Auth.JWT | null} */
let cachedAuthClient = null;

/**
 * Parses service account JSON from an env string or file contents.
 * @param {string} raw
 * @returns {object}
 */
function parseCredentials(raw) {
  let credentials;
  try {
    credentials = JSON.parse(raw);
  } catch {
    throw new AppError(
      Messages.MISSING_CREDENTIALS,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'MISSING_CREDENTIALS',
    );
  }

  if (!credentials.client_email || !credentials.private_key) {
    throw new AppError(
      Messages.MISSING_CREDENTIALS,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'MISSING_CREDENTIALS',
    );
  }

  // Vercel/env often stores newlines as escaped \\n
  if (typeof credentials.private_key === 'string') {
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  }

  return credentials;
}

/**
 * Loads credentials from GOOGLE_SERVICE_ACCOUNT_JSON env, else from disk.
 * @returns {Promise<object>}
 */
async function loadCredentials() {
  if (googleConfig.credentialsJson) {
    return parseCredentials(googleConfig.credentialsJson);
  }

  const credentialsPath = googleConfig.credentialsPath;

  try {
    await fs.access(credentialsPath);
  } catch {
    throw new AppError(
      `${Messages.CREDENTIALS_FILE_NOT_FOUND}: ${credentialsPath}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'MISSING_CREDENTIALS',
    );
  }

  let raw;
  try {
    raw = await fs.readFile(credentialsPath, 'utf8');
  } catch (error) {
    logger.error('Failed to read service account credentials file', {
      path: credentialsPath,
      error: error.message,
    });
    throw new AppError(
      Messages.MISSING_CREDENTIALS,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'MISSING_CREDENTIALS',
    );
  }

  return parseCredentials(raw);
}

/**
 * Returns a reusable Google JWT auth client (connection reuse / lazy init).
 * @returns {Promise<import('googleapis').Auth.JWT>}
 */
export async function getGoogleAuthClient() {
  if (cachedAuthClient) {
    return cachedAuthClient;
  }

  const credentials = await loadCredentials();

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: googleConfig.scopes,
  });

  try {
    await auth.authorize();
  } catch (error) {
    logger.error('Google service account authorization failed', {
      error: error.message,
    });
    throw new AppError(
      Messages.MISSING_CREDENTIALS,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'MISSING_CREDENTIALS',
    );
  }

  cachedAuthClient = auth;
  logger.info('Google service account authenticated successfully');
  return cachedAuthClient;
}

/**
 * Clears the cached auth client (useful for tests or credential rotation).
 */
export function resetGoogleAuthClient() {
  cachedAuthClient = null;
}
