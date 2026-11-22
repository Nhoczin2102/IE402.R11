/**
 * Bộ nhớ đệm LRU + TTL nhẹ (lấy cảm hứng từ node-lru-cache),
 * hỗ trợ tự động xóa cache theo tiền tố (prefix invalidation) khi dữ liệu thay đổi.
 */
class MemoryLruCache {
  constructor({ maxEntries = 200, defaultTtlMs = 30000 } = {}) {
    this.maxEntries = maxEntries;
    this.defaultTtlMs = defaultTtlMs;
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    // Làm mới thứ tự LRU (đẩy key vừa đọc xuống cuối Map)
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key, value, ttlMs = this.defaultTtlMs) {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  invalidatePrefix(prefix) {
    let removed = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  clear() {
    this.store.clear();
  }

  size() {
    return this.store.size;
  }
}

const spatialCache = new MemoryLruCache({
  maxEntries: 200,
  defaultTtlMs: Number(process.env.CACHE_TTL_MS) || 30000,
});

module.exports = {
  MemoryLruCache,
  spatialCache,
};
