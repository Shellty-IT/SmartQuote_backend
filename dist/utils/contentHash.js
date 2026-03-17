"use strict";
// smartquote_backend/src/utils/contentHash.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateContentHash = generateContentHash;
exports.verifyContentHash = verifyContentHash;
const crypto_1 = __importDefault(require("crypto"));
function generateContentHash(input) {
    const normalizedItems = input.items
        .filter((item) => item.isSelected)
        .map((item) => ({
        name: item.name.trim(),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate,
        discount: item.discount,
        variantName: item.variantName || null,
    }))
        .sort((a, b) => a.name.localeCompare(b.name));
    const payload = JSON.stringify({
        offerNumber: input.offerNumber,
        selectedVariant: input.selectedVariant || null,
        items: normalizedItems,
        totalNet: input.totalNet,
        totalVat: input.totalVat,
        totalGross: input.totalGross,
        currency: input.currency,
    });
    return crypto_1.default.createHash('sha256').update(payload, 'utf8').digest('hex');
}
function verifyContentHash(input, expectedHash) {
    const computedHash = generateContentHash(input);
    return crypto_1.default.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(expectedHash, 'hex'));
}
