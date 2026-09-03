/**
 * ⚡ Ultra-Fast In-Memory TTL Cache for High-Frequency Read Operations
 */
class MemoryCache {
  constructor() {
    this.cache = new Map();
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key, value, ttlSeconds = 30) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  del(key) {
    this.cache.delete(key);
  }

  /**
   * Invalidate all cached keys belonging to a specific user
   */
  invalidateUser(userId) {
    const prefix = `user_${userId}`;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }
}

const memoryCache = new MemoryCache();
export default memoryCache;
