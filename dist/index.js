"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const config_1 = require("./config");
const prisma_1 = __importDefault(require("./lib/prisma"));
async function main() {
    try {
        // Test połączenia z bazą danych
        await prisma_1.default.$connect();
        console.log('✅ Połączono z bazą danych');
        // Uruchom serwer
        app_1.default.listen(config_1.config.port, () => {
            console.log(`🚀 Serwer działa na http://localhost:${config_1.config.port}`);
            console.log(`📝 API: http://localhost:${config_1.config.port}/api`);
            console.log(`🔐 Tryb: ${config_1.config.nodeEnv}`);
        });
    }
    catch (error) {
        console.error('❌ Błąd startu serwera:', error);
        process.exit(1);
    }
}
main();
// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Zamykanie serwera...');
    await prisma_1.default.$disconnect();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('\n🛑 Zamykanie serwera...');
    await prisma_1.default.$disconnect();
    process.exit(0);
});
