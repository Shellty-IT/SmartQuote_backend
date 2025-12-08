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
exports.generateOfferNumber = generateOfferNumber;
const prisma_1 = __importDefault(require("../lib/prisma"));
function generateOfferNumber(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const year = new Date().getFullYear();
        const prefix = `OFF/${year}/`;
        // Znajdź ostatni numer oferty dla tego użytkownika w tym roku
        const lastOffer = yield prisma_1.default.offer.findFirst({
            where: {
                userId,
                number: { startsWith: prefix },
            },
            orderBy: { number: 'desc' },
            select: { number: true },
        });
        let nextNumber = 1;
        if (lastOffer) {
            const lastNumberStr = lastOffer.number.replace(prefix, '');
            const lastNum = parseInt(lastNumberStr, 10);
            if (!isNaN(lastNum)) {
                nextNumber = lastNum + 1;
            }
        }
        return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
    });
}
