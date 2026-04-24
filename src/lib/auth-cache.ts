// src/lib/auth-cache.ts
interface CachedUser {
    id: string;
    email: string;
    name: string | null;
    role: string;
    isActive: boolean;
    cachedAt: number;
}

const cache = new Map<string, CachedUser>();
const TTL_MS = 5 * 60 * 1000;

export const authCache = {
    get(userId: string): Omit<CachedUser, 'cachedAt'> | null {
        const cached = cache.get(userId);
        if (!cached) return null;

        if (Date.now() - cached.cachedAt > TTL_MS) {
            cache.delete(userId);
            return null;
        }

        const { cachedAt: _omit, ...user } = cached;
        return user;
    },

    set(user: Omit<CachedUser, 'cachedAt'>): void {
        cache.set(user.id, { ...user, cachedAt: Date.now() });
    },

    invalidate(userId: string): void {
        cache.delete(userId);
    },

    clear(): void {
        cache.clear();
    },
};