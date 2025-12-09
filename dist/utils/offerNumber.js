"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOfferNumber = generateOfferNumber;
const prisma_1 = __importDefault(require("../lib/prisma"));
async function generateOfferNumber(userId) {
    const year = new Date().getFullYear();
    const prefix = `OFF/${year}/`;
    // Znajdź ostatni numer oferty dla tego użytkownika w tym roku
    const lastOffer = await prisma_1.default.offer.findFirst({
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
}
