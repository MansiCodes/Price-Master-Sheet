import { healthService } from '../services/healthService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * HTTP adapter for health checks.
 */
export class HealthController {
  /**
   * @param {object} [deps]
   * @param {import('../services/healthService.js').HealthService} [deps.service]
   */
  constructor({ service = healthService } = {}) {
    this.service = service;
  }

  /**
   * GET /api/v1/health
   * Returns status plus last cache refresh time (bonus).
   */
  getHealth = asyncHandler(async (_req, res) => {
    const health = this.service.getHealth();
    return res.status(200).json({
      status: health.status,
      lastRefreshTime: health.lastRefreshTime,
      environment: health.environment,
      uptime: health.uptime,
    });
  });
}

export const healthController = new HealthController();
