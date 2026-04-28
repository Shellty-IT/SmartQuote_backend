// src/lib/di-container.ts
type Constructor<T = unknown> = new (...args: unknown[]) => T;

class DIContainer {
    private instances = new Map<string, unknown>();
    private factories = new Map<string, () => unknown>();

    register<T>(key: string, factory: () => T): void {
        this.factories.set(key, factory);
    }

    registerSingleton<T>(key: string, instance: T): void {
        this.instances.set(key, instance);
    }

    resolve<T>(key: string): T {
        if (this.instances.has(key)) {
            return this.instances.get(key) as T;
        }

        const factory = this.factories.get(key);
        if (!factory) {
            throw new Error(`No factory registered for key: ${key}`);
        }

        const instance = factory();
        this.instances.set(key, instance);
        return instance as T;
    }

    has(key: string): boolean {
        return this.instances.has(key) || this.factories.has(key);
    }

    clear(): void {
        this.instances.clear();
        this.factories.clear();
    }
}

export const container = new DIContainer();

export function injectable<T>(key: string, factory: () => T): void {
    container.register(key, factory);
}

export function singleton<T>(key: string, instance: T): void {
    container.registerSingleton(key, instance);
}

export function inject<T>(key: string): T {
    return container.resolve<T>(key);
}