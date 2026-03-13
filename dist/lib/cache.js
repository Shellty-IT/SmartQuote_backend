"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CACHE_TTL = exports.aiCache = void 0;
exports.buildCacheKey = buildCacheKey;
class MemoryCache {
    constructor(maxSize = 500) {
        this.store = new Map();
        this.cleanupInterval = null;
        this.maxSize = maxSize;
        this.startCleanup();
    }
    get(key) {
        const entry = this.store.get(key);
        if (!entry)
            return null;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return null;
        }
        return entry.data;
    }
    set(key, data, ttlSeconds) {
        if (this.store.size >= this.maxSize) {
            this.evictExpired();
            if (this.store.size >= this.maxSize) {
                const firstKey = this.store.keys().next().value;
                if (firstKey)
                    this.store.delete(firstKey);
            }
        }
        this.store.set(key, {
            data,
            expiresAt: Date.now() + ttlSeconds * 1000,
        });
    }
    has(key) {
        return this.get(key) !== null;
    }
    delete(key) {
        return this.store.delete(key);
    }
    invalidatePattern(pattern) {
        let count = 0;
        for (const key of this.store.keys()) {
            if (key.includes(pattern)) {
                this.store.delete(key);
                count++;
            }
        }
        return count;
    }
    clear() {
        this.store.clear();
    }
    size() {
        return this.store.size;
    }
    stats() {
        return {
            size: this.store.size,
            maxSize: this.maxSize,
        };
    }
    evictExpired() {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
            if (now > entry.expiresAt) {
                this.store.delete(key);
            }
        }
    }
    startCleanup() {
        this.cleanupInterval = setInterval(() => {
            this.evictExpired();
        }, 5 * 60 * 1000);
        if (this.cleanupInterval.unref) {
            this.cleanupInterval.unref();
        }
    }
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.store.clear();
    }
}
exports.aiCache = new MemoryCache(200);
exports.CACHE_TTL = {
    PRICE_INSIGHT: 15 * 60,
    OBSERVER: 5 * 60,
    CLOSING_STRATEGY: 5 * 60,
    CLIENT_ANALYSIS: 10 * 60,
};
function buildCacheKey(prefix, ...parts) {
    return `${prefix}:${parts.join(':')}`;
}
