/**
 * Simple In-Memory Cache Utility
 * Built by C1 Cloud (CP3) - Autonomous Work
 *
 * Lightweight caching for frequently accessed data
 * Note: Data is lost on server restart. For persistent caching, use Redis.
 *
 * Usage:
 *   const cache = require('./utils/cache');
 *   cache.set('user:123', userData, 300); // 5 min TTL
 *   const user = cache.get('user:123');
 */

class SimpleCache {
  constructor(options = {}) {
    this.store = new Map();
    this.defaultTTL = options.defaultTTL || 300; // 5 minutes
    this.maxSize = options.maxSize || 1000;
    this.cleanupInterval = options.cleanupInterval || 60000; // 1 minute

    // Start cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);

    // Don't prevent process exit
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Set a value in the cache
   * @param {string} key
   * @param {*} value
   * @param {number} ttl - Time to live in seconds
   * @returns {boolean}
   */
  set(key, value, ttl = this.defaultTTL) {
    // Enforce max size
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      this.evictOldest();
    }

    const expiresAt = ttl > 0 ? Date.now() + (ttl * 1000) : null;

    this.store.set(key, {
      value,
      expiresAt,
      createdAt: Date.now()
    });

    return true;
  }

  /**
   * Get a value from the cache
   * @param {string} key
   * @returns {*} Value or undefined if not found/expired
   */
  get(key) {
    const entry = this.store.get(key);

    if (!entry) {
      return undefined;
    }

    // Check expiration
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Check if key exists and is not expired
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== undefined;
  }

  /**
   * Delete a key from the cache
   * @param {string} key
   * @returns {boolean}
   */
  delete(key) {
    return this.store.delete(key);
  }

  /**
   * Clear all entries from the cache
   */
  clear() {
    this.store.clear();
  }

  /**
   * Get or set with callback
   * @param {string} key
   * @param {Function} callback - Async function to get value if not cached
   * @param {number} ttl
   * @returns {Promise<*>}
   */
  async getOrSet(key, callback, ttl = this.defaultTTL) {
    const cached = this.get(key);

    if (cached !== undefined) {
      return cached;
    }

    const value = await callback();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Delete all keys matching a pattern
   * @param {string} pattern - Prefix to match
   * @returns {number} Number of keys deleted
   */
  deletePattern(pattern) {
    let count = 0;

    for (const key of this.store.keys()) {
      if (key.startsWith(pattern)) {
        this.store.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Get cache statistics
   * @returns {Object}
   */
  stats() {
    let expired = 0;
    let valid = 0;
    const now = Date.now();

    for (const entry of this.store.values()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        expired++;
      } else {
        valid++;
      }
    }

    return {
      size: this.store.size,
      valid,
      expired,
      maxSize: this.maxSize,
      defaultTTL: this.defaultTTL
    };
  }

  /**
   * Remove expired entries
   */
  cleanup() {
    const now = Date.now();

    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Evict the oldest entry
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.store.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.store.delete(oldestKey);
    }
  }

  /**
   * Stop the cleanup timer
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.store.clear();
  }
}

/**
 * Cache middleware for Express routes
 * @param {number} ttl - Cache duration in seconds
 * @returns {Function} Express middleware
 */
function cacheMiddleware(ttl = 60) {
  return function (req, res, next) {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `route:${req.originalUrl}`;
    const cached = cache.get(key);

    if (cached) {
      return res.json(cached);
    }

    // Override res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      cache.set(key, data, ttl);
      return originalJson(data);
    };

    next();
  };
}

// Create singleton instance
const cache = new SimpleCache();

// Export both instance and class
module.exports = cache;
module.exports.SimpleCache = SimpleCache;
module.exports.cacheMiddleware = cacheMiddleware;
