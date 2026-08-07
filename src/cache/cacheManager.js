import NodeCache from 'node-cache';
import { env } from '../config/env.js';
import { CacheKeys } from '../constants/cacheKeys.js';
import { logger } from '../utils/logger.js';

/**
 * In-memory cache manager wrapping node-cache.
 * TTL defaults to CACHE_TTL (seconds). Data auto-expires and is refreshed on next read.
 */
class CacheManager {
  constructor(ttlSeconds = env.cacheTtlSeconds) {
    this.ttlSeconds = ttlSeconds;
    this.store = new NodeCache({
      stdTTL: ttlSeconds,
      checkperiod: Math.min(60, Math.max(1, Math.floor(ttlSeconds / 2))),
      useClones: true,
    });

    this.store.on('expired', (key) => {
      logger.info('Cache key expired', { key });
    });
  }

  /**
   * @param {string} key
   * @returns {*}
   */
  get(key) {
    return this.store.get(key);
  }

  /**
   * @param {string} key
   * @param {*} value
   * @param {number} [ttlSeconds]
   * @returns {boolean}
   */
  set(key, value, ttlSeconds = this.ttlSeconds) {
    const ok = this.store.set(key, value, ttlSeconds);
    if (ok) {
      this.store.set(CacheKeys.LAST_REFRESH_AT, new Date().toISOString(), 0);
    }
    return ok;
  }

  /**
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this.store.has(key);
  }

  /**
   * @param {string} key
   * @returns {number}
   */
  del(key) {
    return this.store.del(key);
  }

  /**
   * Clears all cached entries including last refresh metadata.
   */
  flush() {
    this.store.flushAll();
    logger.info('Cache flushed');
  }

  /**
   * @returns {string|null}
   */
  getLastRefreshTime() {
    return this.store.get(CacheKeys.LAST_REFRESH_AT) ?? null;
  }

  /**
   * Returns seconds remaining for a key, or undefined if missing.
   * @param {string} key
   * @returns {number|undefined}
   */
  getTtl(key) {
    return this.store.getTtl(key);
  }
}

/** Singleton cache instance for the process */
export const cacheManager = new CacheManager();
