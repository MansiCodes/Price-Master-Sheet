import axios from 'axios';
import { env } from '../config/env.js';

/**
 * Shared Axios instance for outbound HTTP calls.
 * Provides connection reuse, default timeout, and consistent headers.
 */
export const httpClient = axios.create({
  timeout: env.googleSheetsTimeoutMs,
  headers: {
    Accept: 'application/json',
  },
  transitional: {
    clarifyTimeoutError: true,
  },
});
