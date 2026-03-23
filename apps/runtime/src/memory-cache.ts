interface CacheEntry<T = unknown> {
  value: T;
  expires_at: number;
  size_bytes: number;
}

export interface MemoryCacheOptions {
  /** Maximum number of entries in the cache. Default: 100 */
  maxSize?: number;
  /** Maximum byte size per entry. Default: 8192 (8KB) */
  maxEntryBytes?: number;
}

/**
 * Simple in-memory LRU cache with TTL support for skill results
 * and session context.
 */
export class MemoryCache {
  private entries: Map<string, CacheEntry> = new Map();
  private maxSize: number;
  private maxEntryBytes: number;

  constructor(options: MemoryCacheOptions = {}) {
    this.maxSize = options.maxSize ?? 100;
    this.maxEntryBytes = options.maxEntryBytes ?? 8192;
  }

  /**
   * Get a value from the cache. Returns undefined if the key does not
   * exist or the entry has expired.
   */
  get<T = unknown>(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      return undefined;
    }

    // Check expiration
    if (Date.now() > entry.expires_at) {
      this.entries.delete(key);
      return undefined;
    }

    // Move to the end to mark as recently used (LRU)
    this.entries.delete(key);
    this.entries.set(key, entry);

    return entry.value as T;
  }

  /**
   * Set a value in the cache with an optional TTL in milliseconds.
   * If no TTL is given, the entry lives for 5 minutes.
   */
  set(key: string, value: unknown, ttlMs: number = 300_000): boolean {
    const serialized = JSON.stringify(value);
    const sizeBytes = Buffer.byteLength(serialized, "utf-8");

    // Reject entries that exceed the per-entry size limit
    if (sizeBytes > this.maxEntryBytes) {
      return false;
    }

    // If the key already exists, delete it first so it moves to the end
    if (this.entries.has(key)) {
      this.entries.delete(key);
    }

    // Evict stale entries first, then evict LRU if still at capacity
    this.evictExpired();
    while (this.entries.size >= this.maxSize) {
      this.evictLRU();
    }

    this.entries.set(key, {
      value,
      expires_at: Date.now() + ttlMs,
      size_bytes: sizeBytes,
    });

    return true;
  }

  /**
   * Delete a specific key from the cache.
   */
  delete(key: string): boolean {
    return this.entries.delete(key);
  }

  /**
   * Clear all entries from the cache.
   */
  clear(): void {
    this.entries.clear();
  }

  /**
   * Return the number of entries currently in the cache.
   */
  get size(): number {
    return this.entries.size;
  }

  /**
   * Remove all expired entries.
   */
  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (now > entry.expires_at) {
        this.entries.delete(key);
      }
    }
  }

  /**
   * Remove the least recently used entry (the first one in the Map,
   * since Map preserves insertion order).
   */
  private evictLRU(): void {
    const firstKey = this.entries.keys().next().value;
    if (firstKey !== undefined) {
      this.entries.delete(firstKey);
    }
  }
}
