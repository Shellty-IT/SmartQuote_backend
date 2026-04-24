// src/lib/logger.ts
import pino from 'pino';
import { config, isDev } from '../config';

export const logger = pino({
    level: isDev ? 'debug' : 'info',
    transport: isDev
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            },
        }
        : undefined,
    base: {
        env: config.nodeEnv,
    },
    formatters: {
        level(label: string) {
            return { level: label };
        },
    },
});

export function createRequestLogger(requestId: string) {
    return logger.child({ requestId });
}

export function createModuleLogger(module: string) {
    return logger.child({ module });
}