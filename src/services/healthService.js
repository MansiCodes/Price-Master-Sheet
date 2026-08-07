import { env } from '../config/env.js';
import { Messages } from '../constants/messages.js';
import { rateService } from './rateService.js';

/**
 * Health check use cases for readiness/liveness style reporting.
 */
export class HealthService {
  /**
   * @param {object} [deps]
   * @param {import('./rateService.js').RateService} [deps.rates]
   */
  constructor({ rates = rateService } = {}) {
    this.rates = rates;
  }

  /**
   * @returns {{ status: string, lastRefreshTime: string|null, environment: string, uptime: number }}
   */
  getHealth() {
    return {
      status: Messages.HEALTH_OK,
      lastRefreshTime: this.rates.getLastRefreshTime(),
      environment: env.nodeEnv,
      uptime: Math.floor(process.uptime()),
    };
  }
}

export const healthService = new HealthService();
