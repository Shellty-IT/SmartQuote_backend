// src/index.ts
import app from './app';
import { config } from './config';
import prisma from './lib/prisma';
import { logger } from './lib/logger';

const server = app.listen(config.port, () => {
    logger.info(
        {
            port: config.port,
            env: config.nodeEnv,
        },
        'Server started',
    );
});

async function shutdown(signal: string): Promise<void> {
    logger.info({ signal }, 'Shutdown initiated');

    await new Promise<void>((resolve, reject) => {
        server.close((err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });

    logger.info('HTTP server closed');

    await prisma.$disconnect();
    logger.info('Database connection closed');

    process.exit(0);
}

process.on('SIGTERM', () => {
    shutdown('SIGTERM').catch((err: unknown) => {
        logger.fatal({ err }, 'Shutdown failed');
        process.exit(1);
    });
});

process.on('SIGINT', () => {
    shutdown('SIGINT').catch((err: unknown) => {
        logger.fatal({ err }, 'Shutdown failed');
        process.exit(1);
    });
});

process.on('uncaughtException', (err: Error) => {
    logger.fatal({ err }, 'Uncaught exception');
    shutdown('uncaughtException').catch(() => process.exit(1));
});

process.on('unhandledRejection', (reason: unknown) => {
    logger.fatal({ reason }, 'Unhandled rejection');
    shutdown('unhandledRejection').catch(() => process.exit(1));
});