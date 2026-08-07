import { googleConfig } from '../config/google.js';
import { HttpStatus } from '../constants/httpStatus.js';
import { Messages } from '../constants/messages.js';
import { AppError } from '../utils/AppError.js';
import { getGoogleAuthClient } from '../utils/googleAuth.js';
import { httpClient } from '../utils/httpClient.js';
import { logger } from '../utils/logger.js';
import {
  assertSheetStructure,
  mapSheetRowsToRates,
} from '../utils/sheetReader.js';

/**
 * Low-level Google Sheets data access for the cable price workbook.
 */
export class GoogleSheetsRepository {
  /**
   * @param {object} [deps]
   * @param {typeof getGoogleAuthClient} [deps.getAuthClient]
   * @param {import('axios').AxiosInstance} [deps.http]
   * @param {object} [deps.config]
   */
  constructor({
    getAuthClient = getGoogleAuthClient,
    http = httpClient,
    config = googleConfig,
  } = {}) {
    this.getAuthClient = getAuthClient;
    this.http = http;
    this.config = config;
    /** @type {string|null} */
    this.resolvedSheetName = null;
  }

  /**
   * Reads cable rows and maps to domain rates.
   * @returns {Promise<import('../types/rate.types.js').CableRate[]>}
   */
  async fetchDailyRates() {
    if (!this.config.sheetId) {
      throw new AppError(
        Messages.MISSING_SHEET_ID,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'MISSING_SHEET_ID',
      );
    }

    try {
      const sheetName = await this.#resolveSheetName();
      const rows = await this.#fetchValues(`${sheetName}!A:L`);
      assertSheetStructure(rows);
      const rates = mapSheetRowsToRates(rows);

      logger.info('Fetched rates from Google Sheets', {
        count: rates.length,
        sheetName,
      });
      return rates;
    } catch (error) {
      throw this.#mapGoogleError(error);
    }
  }

  /**
   * Uses configured tab name, or auto-detects the tab that has NAME OF CABLE.
   * @returns {Promise<string>}
   */
  async #resolveSheetName() {
    if (this.resolvedSheetName) {
      return this.resolvedSheetName;
    }

    const configured = this.config.sheetName;
    const titles = await this.#listSheetTitles();

    if (titles.includes(configured)) {
      this.resolvedSheetName = configured;
      return configured;
    }

    for (const title of titles) {
      try {
        const rows = await this.#fetchValues(`${title}!A1:L10`);
        const hasHeader = (rows || []).some((row) => {
          const joined = (row || []).map((c) => String(c).toLowerCase()).join(' ');
          return joined.includes('name of cable') || joined.includes('p=10');
        });
        if (hasHeader) {
          logger.info('Auto-detected sheet tab', { title });
          this.resolvedSheetName = title;
          return title;
        }
      } catch {
        // try next tab
      }
    }

    if (titles.length > 0) {
      // Fall back to first tab if detection fails
      logger.warn('Could not detect header tab; using first sheet', {
        title: titles[0],
      });
      this.resolvedSheetName = titles[0];
      return titles[0];
    }

    throw new AppError(Messages.MISSING_SHEET, HttpStatus.NOT_FOUND, 'MISSING_SHEET');
  }

  /**
   * @returns {Promise<string[]>}
   */
  async #listSheetTitles() {
    const accessToken = await this.#getAccessToken();
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.config.sheetId}`;

    const response = await this.http.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        fields: 'sheets.properties.title',
      },
      timeout: this.config.timeoutMs,
    });

    const sheets = response.data?.sheets || [];
    return sheets
      .map((sheet) => sheet?.properties?.title)
      .filter(Boolean);
  }

  /**
   * @param {string} range
   * @returns {Promise<Array<Array<*>>>}
   */
  async #fetchValues(range) {
    const accessToken = await this.#getAccessToken();
    const encodedRange = encodeURIComponent(range);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.config.sheetId}/values/${encodedRange}`;

    const response = await this.http.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        majorDimension: 'ROWS',
      },
      timeout: this.config.timeoutMs,
    });

    return response.data?.values || [];
  }

  /**
   * @returns {Promise<string>}
   */
  async #getAccessToken() {
    const auth = await this.getAuthClient();
    const tokenResponse = await auth.getAccessToken();
    const token = typeof tokenResponse === 'string'
      ? tokenResponse
      : tokenResponse?.token;

    if (!token) {
      throw new AppError(
        Messages.MISSING_CREDENTIALS,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'MISSING_CREDENTIALS',
      );
    }

    return token;
  }

  /**
   * @param {*} error
   * @returns {AppError}
   */
  #mapGoogleError(error) {
    if (error instanceof AppError) {
      return error;
    }

    const axiosStatus = error?.response?.status;
    const axiosMessage = error?.response?.data?.error?.message
      || error?.message
      || String(error);
    const code = error?.code;
    const lower = String(axiosMessage).toLowerCase();

    logger.error('Google Sheets API error', {
      status: axiosStatus,
      code,
      message: axiosMessage,
    });

    if (
      code === 'ECONNABORTED'
      || code === 'ETIMEDOUT'
      || lower.includes('timeout')
    ) {
      return new AppError(Messages.TIMEOUT, HttpStatus.GATEWAY_TIMEOUT, 'TIMEOUT');
    }

    if (
      code === 'ENOTFOUND'
      || code === 'ECONNREFUSED'
      || code === 'ECONNRESET'
      || code === 'ERR_NETWORK'
      || lower.includes('network')
    ) {
      return new AppError(
        Messages.NETWORK_FAILURE,
        HttpStatus.BAD_GATEWAY,
        'NETWORK_FAILURE',
      );
    }

    if (axiosStatus === 404 || lower.includes('requested entity was not found')) {
      return new AppError(
        Messages.INVALID_SHEET,
        HttpStatus.NOT_FOUND,
        'INVALID_SHEET',
      );
    }

    if (
      lower.includes('unable to parse range')
      || lower.includes('unable to parse the range')
      || lower.includes('parse range')
    ) {
      return new AppError(
        Messages.MISSING_SHEET,
        HttpStatus.NOT_FOUND,
        'MISSING_SHEET',
      );
    }

    if (axiosStatus === 403 || axiosStatus === 401) {
      return new AppError(
        Messages.MISSING_CREDENTIALS,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'MISSING_CREDENTIALS',
      );
    }

    return new AppError(
      Messages.GOOGLE_API_FAILURE,
      HttpStatus.BAD_GATEWAY,
      'GOOGLE_API_FAILURE',
    );
  }
}

export const googleSheetsRepository = new GoogleSheetsRepository();
