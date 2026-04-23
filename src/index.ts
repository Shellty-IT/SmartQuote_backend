// src/index.ts

import app from './app';
import { config } from './config';
import prisma from './lib/prisma';

const server = app.listen(config.port, () => {
    console.log(
        `[${new Date().toISOString()}] 🚀 Serwer uruchomiony na porcie ${config.port} [${config.nodeEnv}]`,
    );
});

async function shutdown(signal: string): Promise<void> {
    console.log(`\n[${new Date().toISOString()}] 🛑 Otrzymano sygnał ${signal} — zamykanie serwera...`);

    await new Promise<void>((resolve, reject) => {
        server.close((err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });

    console.log(`[${new Date().toISOString()}] ✅ Serwer HTTP zamknięty`);

    await prisma.$disconnect();
    console.log(`[${new Date().toISOString()}] ✅ Połączenie z bazą danych zamknięte`);

    process.exit(0);
}

process.on('SIGTERM', () => {
    shutdown('SIGTERM').catch((err: unknown) => {
        console.error('Błąd podczas zamykania:', err);
        process.exit(1);
    });
});

process.on('SIGINT', () => {
    shutdown('SIGINT').catch((err: unknown) => {
        console.error('Błąd podczas zamykania:', err);
        process.exit(1);
    });
});

process.on('uncaughtException', (err: Error) => {
    console.error(`[${new Date().toISOString()}] 💥 uncaughtException:`, err);
    shutdown('uncaughtException').catch(() => process.exit(1));
});

process.on('unhandledRejection', (reason: unknown) => {
    console.error(`[${new Date().toISOString()}] 💥 unhandledRejection:`, reason);
    shutdown('unhandledRejection').catch(() => process.exit(1));
});