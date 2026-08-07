import { HttpStatus } from '../constants/httpStatus.js';
import { Messages } from '../constants/messages.js';
import { rateRepository } from '../repositories/rateRepository.js';
import { AppError } from '../utils/AppError.js';

/**
 * Application service for cable rate use cases.
 */
export class RateService {
  /**
   * @param {object} [deps]
   * @param {import('../repositories/rateRepository.js').RateRepository} [deps.repository]
   */
  constructor({ repository = rateRepository } = {}) {
    this.repository = repository;
  }

  /**
   * @returns {Promise<import('../types/rate.types.js').CableRate[]>}
   */
  async getAllRates() {
    return this.repository.findAll();
  }

  /**
   * @param {string} identifier - Serial number or cable name
   * @returns {Promise<import('../types/rate.types.js').CableRate>}
   */
  async getRateByIdentifier(identifier) {
    const rate = await this.repository.findByIdentifier(identifier);

    if (!rate) {
      throw new AppError(
        Messages.RATE_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        'RATE_NOT_FOUND',
      );
    }

    return rate;
  }

  /**
   * @deprecated Use getRateByIdentifier
   * @param {string} shortForm
   */
  async getRateByShortForm(shortForm) {
    return this.getRateByIdentifier(shortForm);
  }

  /**
   * @returns {Promise<{ count: number, lastRefreshTime: string|null }>}
   */
  async refreshCache() {
    const { rates, lastRefreshTime } = await this.repository.refresh();
    return {
      count: rates.length,
      lastRefreshTime,
    };
  }

  /**
   * @returns {string|null}
   */
  getLastRefreshTime() {
    return this.repository.getLastRefreshTime();
  }
}

export const rateService = new RateService();
