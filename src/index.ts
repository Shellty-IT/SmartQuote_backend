import app from './app';
import { config } from './config';
import prisma from './lib/prisma';

async function main() {
    try {
        // Test połączenia z bazą danych
        await prisma.$connect();
        console.log('✅ Połączono z bazą danych');

        // Uruchom serwer
        app.listen(config.port, () => {
            console.log(`🚀 Serwer działa na http://localhost:${config.port}`);
            console.log(`📝 API: http://localhost:${config.port}/api`);
            console.log(`🔐 Tryb: ${config.nodeEnv}`);
        });
    } catch (error) {
        console.error('❌ Błąd startu serwera:', error);
        process.exit(1);
    }
}

main();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Zamykanie serwera...');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Zamykanie serwera...');
    await prisma.$disconnect();
    process.exit(0);
});