import { Messages } from '../constants/messages.js';
import { rateService } from '../services/rateService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/responseFormatter.js';

/**
 * HTTP adapter for rate-related endpoints.
 */
export class RateController {
  /**
   * @param {object} [deps]
   * @param {import('../services/rateService.js').RateService} [deps.service]
   */
  constructor({ service = rateService } = {}) {
    this.service = service;
  }

  /**
   * GET /api/v1/rates
   */
  getAll = asyncHandler(async (_req, res) => {
    const data = await this.service.getAllRates();
    return sendSuccess(res, {
      message: Messages.RATES_FETCHED,
      data,
    });
  });

  /**
   * GET /api/v1/rates/:identifier
   * identifier = S NO (e.g. 1) or exact cable name
   */
  getByIdentifier = asyncHandler(async (req, res) => {
    const data = await this.service.getRateByIdentifier(req.params.identifier);
    return sendSuccess(res, {
      message: Messages.RATE_FETCHED,
      data,
    });
  });
}

export const rateController = new RateController();
