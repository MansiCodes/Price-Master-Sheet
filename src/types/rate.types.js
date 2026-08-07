/**
 * Domain types for cable rates.
 *
 * @typedef {Object} CableRate
 * @property {number|null} sNo - Serial number from sheet column A
 * @property {string} name - Cable name (column B)
 * @property {string} specification - Short description (from column C)
 * @property {string} specificationFull - Full description text
 * @property {number} p10 - Price at 10% (column I)
 * @property {number} p12 - Price at 12% (column J)
 * @property {number} p15 - Price at 15% (column K)
 * @property {number} p20 - Price at 20% (column L)
 */

/**
 * @typedef {Object} ApiSuccessResponse
 * @property {true} success
 * @property {string} message
 * @property {*} [data]
 */

/**
 * @typedef {Object} ApiErrorResponse
 * @property {false} success
 * @property {string} message
 * @property {*} [errors]
 */

/**
 * @typedef {Object} HealthStatus
 * @property {string} status
 * @property {string|null} lastRefreshTime
 * @property {string} environment
 * @property {number} uptime
 */

/**
 * @typedef {Object} ServiceAccountCredentials
 * @property {string} client_email
 * @property {string} private_key
 * @property {string} [project_id]
 */

export {};
