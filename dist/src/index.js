"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const config_1 = require("./config");
const prisma_1 = __importDefault(require("./lib/prisma"));
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Test połączenia z bazą danych
            yield prisma_1.default.$connect();
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
    });
}
main();
// Graceful shutdown
process.on('SIGINT', () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('\n🛑 Zamykanie serwera...');
    yield prisma_1.default.$disconnect();
    process.exit(0);
}));
process.on('SIGTERM', () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('\n🛑 Zamykanie serwera...');
    yield prisma_1.default.$disconnect();
    process.exit(0);
}));
