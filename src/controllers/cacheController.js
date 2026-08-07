import { Messages } from '../constants/messages.js';
import { rateService } from '../services/rateService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/responseFormatter.js';

/**
 * HTTP adapter for cache administration endpoints.
 */
export class CacheController {
  /**
   * @param {object} [deps]
   * @param {import('../services/rateService.js').RateService} [deps.service]
   */
  constructor({ service = rateService } = {}) {
    this.service = service;
  }

  /**
   * POST /api/v1/cache/refresh
   * Clears and reloads rates from Google Sheets.
   */
  refresh = asyncHandler(async (_req, res) => {
    const result = await this.service.refreshCache();
    return sendSuccess(res, {
      message: Messages.CACHE_REFRESHED,
      data: result,
    });
  });
}

export const cacheController = new CacheController();
