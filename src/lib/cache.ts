// src/lib/cache.ts
interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

export class MemoryCache {
    private store: Map<string, CacheEntry<unknown>> = new Map();
    private maxSize: number;
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor(maxSize = 500) {
        this.maxSize = maxSize;
        this.startCleanup();
    }

    get<T>(key: string): T | null {
        const entry = this.store.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return null;
        }

        return entry.data as T;
    }

    set<T>(key: string, data: T, ttlSeconds: number): void {
        if (this.store.size >= this.maxSize) {
            this.evictExpired();
            if (this.store.size >= this.maxSize) {
                const firstKey = this.store.keys().next().value;
                if (firstKey) this.store.delete(firstKey);
            }
        }

        this.store.set(key, {
            data,
            expiresAt: Date.now() + ttlSeconds * 1000,
        });
    }

    has(key: string): boolean {
        return this.get(key) !== null;
    }

    delete(key: string): boolean {
        return this.store.delete(key);
    }

    invalidatePattern(pattern: string): number {
        let count = 0;
        for (const key of this.store.keys()) {
            if (key.includes(pattern)) {
                this.store.delete(key);
                count++;
            }
        }
        return count;
    }

    clear(): void {
        this.store.clear();
    }

    size(): number {
        return this.store.size;
    }

    stats(): { size: number; maxSize: number } {
        return {
            size: this.store.size,
            maxSize: this.maxSize,
        };
    }

    private evictExpired(): void {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
            if (now > entry.expiresAt) {
                this.store.delete(key);
            }
        }
    }

    private startCleanup(): void {
        this.cleanupInterval = setInterval(() => {
            this.evictExpired();
        }, 5 * 60 * 1000);

        if (this.cleanupInterval.unref) {
            this.cleanupInterval.unref();
        }
    }

    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.store.clear();
    }
}

export const aiCache = new MemoryCache(200);

export const CACHE_TTL = {
    PRICE_INSIGHT: 15 * 60,
    OBSERVER: 5 * 60,
    CLOSING_STRATEGY: 5 * 60,
    CLIENT_ANALYSIS: 10 * 60,
} as const;

export function buildCacheKey(prefix: string, ...parts: string[]): string {
    return `${prefix}:${parts.join(':')}`;
}