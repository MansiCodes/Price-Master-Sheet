/**
 * @typedef {import('../types/rate.types.js').CableRate} CableRate
 */

/**
 * Contract for rate data access.
 *
 * @interface IRateRepository
 */
export class IRateRepository {
  /**
   * @returns {Promise<CableRate[]>}
   */
  async findAll() {
    throw new Error('IRateRepository.findAll must be implemented');
  }

  /**
   * Finds a rate by serial number or cable name.
   * @param {string} _identifier
   * @returns {Promise<CableRate|null>}
   */
  async findByIdentifier(_identifier) {
    throw new Error('IRateRepository.findByIdentifier must be implemented');
  }
}
