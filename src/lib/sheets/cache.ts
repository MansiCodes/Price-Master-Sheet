type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

/**
 * Simple in-memory Map cache with TTL (seconds).
 */
class TtlCache {
  private store = new Map<string, CacheEntry<unknown>>();
  readonly ttlSeconds: number;

  constructor(ttlSeconds = Number(process.env.CACHE_TTL) || 300) {
    this.ttlSeconds = ttlSeconds;
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }

    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds = this.ttlSeconds): void {
    const ttlMs = ttlSeconds <= 0 ? Number.POSITIVE_INFINITY : ttlSeconds * 1000;
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  del(key: string): boolean {
    return this.store.delete(key);
  }

  flush(): void {
    this.store.clear();
  }
}

/** Process-wide cache singleton */
export const sheetsCache = new TtlCache();
