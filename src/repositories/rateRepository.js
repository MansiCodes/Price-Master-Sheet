import { CacheKeys } from '../constants/cacheKeys.js';
import { HttpStatus } from '../constants/httpStatus.js';
import { Messages } from '../constants/messages.js';
import { IRateRepository } from '../interfaces/IRateRepository.js';
import { cacheManager } from '../cache/cacheManager.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { googleSheetsRepository } from './googleSheetsRepository.js';

/**
 * Rate repository — cache-aside over Google Sheets.
 */
export class RateRepository extends IRateRepository {
  /**
   * @param {object} [deps]
   * @param {import('./googleSheetsRepository.js').GoogleSheetsRepository} [deps.sheetsRepository]
   * @param {typeof cacheManager} [deps.cache]
   */
  constructor({
    sheetsRepository = googleSheetsRepository,
    cache = cacheManager,
  } = {}) {
    super();
    this.sheetsRepository = sheetsRepository;
    this.cache = cache;
    /** @type {Promise<import('../types/rate.types.js').CableRate[]>|null} */
    this.inFlightFetch = null;
  }

  /**
   * @returns {Promise<import('../types/rate.types.js').CableRate[]>}
   */
  async findAll() {
    const cached = this.cache.get(CacheKeys.DAILY_RATES);
    if (cached) {
      logger.debug('Serving rates from cache', { count: cached.length });
      return cached;
    }

    return this.#loadAndCache();
  }

  /**
   * Match by S NO or exact cable name (case-insensitive).
   * @param {string} identifier
   * @returns {Promise<import('../types/rate.types.js').CableRate|null>}
   */
  async findByIdentifier(identifier) {
    const rates = await this.findAll();
    const normalized = identifier.trim().toLowerCase();

    const bySerial = rates.find(
      (rate) => rate.sNo !== null && String(rate.sNo) === normalized,
    );
    if (bySerial) {
      return bySerial;
    }

    return rates.find((rate) => rate.name.toLowerCase() === normalized) ?? null;
  }

  /**
   * @deprecated Use findByIdentifier
   * @param {string} shortForm
   */
  async findByShortForm(shortForm) {
    return this.findByIdentifier(shortForm);
  }

  /**
   * @returns {Promise<{ rates: import('../types/rate.types.js').CableRate[], lastRefreshTime: string|null }>}
   */
  async refresh() {
    this.cache.del(CacheKeys.DAILY_RATES);
    this.inFlightFetch = null;
    const rates = await this.#loadAndCache();
    return {
      rates,
      lastRefreshTime: this.cache.getLastRefreshTime(),
    };
  }

  /**
   * @returns {string|null}
   */
  getLastRefreshTime() {
    return this.cache.getLastRefreshTime();
  }

  /**
   * @returns {Promise<import('../types/rate.types.js').CableRate[]>}
   */
  async #loadAndCache() {
    if (this.inFlightFetch) {
      return this.inFlightFetch;
    }

    this.inFlightFetch = this.sheetsRepository
      .fetchDailyRates()
      .then((rates) => {
        this.cache.set(CacheKeys.DAILY_RATES, rates);
        logger.info('Rates cache updated', {
          count: rates.length,
          ttlSeconds: this.cache.ttlSeconds,
        });
        return rates;
      })
      .catch((error) => {
        if (error instanceof AppError) {
          throw error;
        }
        throw new AppError(
          Messages.GOOGLE_API_FAILURE,
          HttpStatus.BAD_GATEWAY,
          'GOOGLE_API_FAILURE',
        );
      })
      .finally(() => {
        this.inFlightFetch = null;
      });

    return this.inFlightFetch;
  }
}

export const rateRepository = new RateRepository();
