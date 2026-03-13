"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// smartquote_backend/src/__tests__/calculations.test.ts
const calculations_1 = require("../utils/calculations");
describe('round2', () => {
    it('rounds to 2 decimal places', () => {
        expect((0, calculations_1.round2)(1.234)).toBe(1.23);
        expect((0, calculations_1.round2)(1.235)).toBe(1.24);
        expect((0, calculations_1.round2)(1.999)).toBe(2);
        expect((0, calculations_1.round2)(0)).toBe(0);
        expect((0, calculations_1.round2)(100)).toBe(100);
    });
    it('handles negative values', () => {
        expect((0, calculations_1.round2)(-1.234)).toBe(-1.23);
        expect((0, calculations_1.round2)(-1.236)).toBe(-1.24);
    });
    it('handles very small values', () => {
        expect((0, calculations_1.round2)(0.001)).toBe(0);
        expect((0, calculations_1.round2)(0.005)).toBe(0.01);
        expect((0, calculations_1.round2)(0.004)).toBe(0);
    });
});
describe('calculateItemTotals', () => {
    it('calculates standard item with 23% VAT', () => {
        const result = (0, calculations_1.calculateItemTotals)({
            quantity: 1,
            unitPrice: 100,
            vatRate: 23,
            discount: 0,
        });
        expect(result.totalNet).toBe(100);
        expect(result.totalVat).toBe(23);
        expect(result.totalGross).toBe(123);
    });
    it('calculates multiple units', () => {
        const result = (0, calculations_1.calculateItemTotals)({
            quantity: 5,
            unitPrice: 200,
            vatRate: 23,
            discount: 0,
        });
        expect(result.totalNet).toBe(1000);
        expect(result.totalVat).toBe(230);
        expect(result.totalGross).toBe(1230);
    });
    it('applies discount correctly', () => {
        const result = (0, calculations_1.calculateItemTotals)({
            quantity: 1,
            unitPrice: 1000,
            vatRate: 23,
            discount: 10,
        });
        expect(result.totalNet).toBe(900);
        expect(result.totalVat).toBe(207);
        expect(result.totalGross).toBe(1107);
    });
    it('handles 50% discount', () => {
        const result = (0, calculations_1.calculateItemTotals)({
            quantity: 2,
            unitPrice: 500,
            vatRate: 23,
            discount: 50,
        });
        expect(result.totalNet).toBe(500);
        expect(result.totalVat).toBe(115);
        expect(result.totalGross).toBe(615);
    });
    it('handles 100% discount', () => {
        const result = (0, calculations_1.calculateItemTotals)({
            quantity: 10,
            unitPrice: 999,
            vatRate: 23,
            discount: 100,
        });
        expect(result.totalNet).toBe(0);
        expect(result.totalVat).toBe(0);
        expect(result.totalGross).toBe(0);
    });
    it('calculates with 0% VAT', () => {
        const result = (0, calculations_1.calculateItemTotals)({
            quantity: 3,
            unitPrice: 150,
            vatRate: 0,
            discount: 0,
        });
        expect(result.totalNet).toBe(450);
        expect(result.totalVat).toBe(0);
        expect(result.totalGross).toBe(450);
    });
    it('calculates with 8% VAT', () => {
        const result = (0, calculations_1.calculateItemTotals)({
            quantity: 1,
            unitPrice: 100,
            vatRate: 8,
            discount: 0,
        });
        expect(result.totalNet).toBe(100);
        expect(result.totalVat).toBe(8);
        expect(result.totalGross).toBe(108);
    });
    it('calculates with 5% VAT', () => {
        const result = (0, calculations_1.calculateItemTotals)({
            quantity: 4,
            unitPrice: 25,
            vatRate: 5,
            discount: 0,
        });
        expect(result.totalNet).toBe(100);
        expect(result.totalVat).toBe(5);
        expect(result.totalGross).toBe(105);
    });
    it('handles fractional quantities', () => {
        const result = (0, calculations_1.calculateItemTotals)({
            quantity: 2.5,
            unitPrice: 100,
            vatRate: 23,
            discount: 0,
        });
        expect(result.totalNet).toBe(250);
        expect(result.totalVat).toBe(57.5);
        expect(result.totalGross).toBe(307.5);
    });
    it('handles fractional prices', () => {
        const result = (0, calculations_1.calculateItemTotals)({
            quantity: 3,
            unitPrice: 33.33,
            vatRate: 23,
            discount: 0,
        });
        expect(result.totalNet).toBe(99.99);
        expect(result.totalVat).toBe(23);
        expect(result.totalGross).toBe(122.99);
    });
    it('handles large quantities', () => {
        const result = (0, calculations_1.calculateItemTotals)({
            quantity: 1000,
            unitPrice: 9999.99,
            vatRate: 23,
            discount: 0,
        });
        expect(result.totalNet).toBe(9999990);
        expect(result.totalVat).toBe(2299997.7);
        expect(result.totalGross).toBe(12299987.7);
    });
    it('handles zero price', () => {
        const result = (0, calculations_1.calculateItemTotals)({
            quantity: 5,
            unitPrice: 0,
            vatRate: 23,
            discount: 0,
        });
        expect(result.totalNet).toBe(0);
        expect(result.totalVat).toBe(0);
        expect(result.totalGross).toBe(0);
    });
    it('handles zero quantity', () => {
        const result = (0, calculations_1.calculateItemTotals)({
            quantity: 0,
            unitPrice: 500,
            vatRate: 23,
            discount: 0,
        });
        expect(result.totalNet).toBe(0);
        expect(result.totalVat).toBe(0);
        expect(result.totalGross).toBe(0);
    });
    it('discount + VAT combined correctly', () => {
        const result = (0, calculations_1.calculateItemTotals)({
            quantity: 10,
            unitPrice: 200,
            vatRate: 23,
            discount: 15,
        });
        expect(result.totalNet).toBe(1700);
        expect(result.totalVat).toBe(391);
        expect(result.totalGross).toBe(2091);
    });
    it('ensures gross = net + vat', () => {
        const testCases = [
            { quantity: 7, unitPrice: 143.57, vatRate: 23, discount: 5 },
            { quantity: 3, unitPrice: 99.99, vatRate: 8, discount: 12 },
            { quantity: 1, unitPrice: 1, vatRate: 23, discount: 0 },
            { quantity: 100, unitPrice: 0.01, vatRate: 5, discount: 0 },
            { quantity: 1.5, unitPrice: 333.33, vatRate: 23, discount: 7 },
        ];
        testCases.forEach((tc) => {
            const r = (0, calculations_1.calculateItemTotals)(tc);
            expect(r.totalGross).toBeCloseTo(r.totalNet + r.totalVat, 2);
        });
    });
});
describe('calculateOfferTotals', () => {
    it('sums single item correctly', () => {
        const items = [{ totalNet: 100, totalVat: 23, totalGross: 123 }];
        const result = (0, calculations_1.calculateOfferTotals)(items);
        expect(result.totalNet).toBe(100);
        expect(result.totalVat).toBe(23);
        expect(result.totalGross).toBe(123);
    });
    it('sums multiple items', () => {
        const items = [
            { totalNet: 100, totalVat: 23, totalGross: 123 },
            { totalNet: 200, totalVat: 46, totalGross: 246 },
            { totalNet: 50, totalVat: 11.5, totalGross: 61.5 },
        ];
        const result = (0, calculations_1.calculateOfferTotals)(items);
        expect(result.totalNet).toBe(350);
        expect(result.totalVat).toBe(80.5);
        expect(result.totalGross).toBe(430.5);
    });
    it('handles empty items array', () => {
        const result = (0, calculations_1.calculateOfferTotals)([]);
        expect(result.totalNet).toBe(0);
        expect(result.totalVat).toBe(0);
        expect(result.totalGross).toBe(0);
    });
    it('sums mixed VAT rates', () => {
        const item23 = (0, calculations_1.calculateItemTotals)({
            quantity: 1,
            unitPrice: 100,
            vatRate: 23,
            discount: 0,
        });
        const item8 = (0, calculations_1.calculateItemTotals)({
            quantity: 1,
            unitPrice: 100,
            vatRate: 8,
            discount: 0,
        });
        const item0 = (0, calculations_1.calculateItemTotals)({
            quantity: 1,
            unitPrice: 100,
            vatRate: 0,
            discount: 0,
        });
        const result = (0, calculations_1.calculateOfferTotals)([item23, item8, item0]);
        expect(result.totalNet).toBe(300);
        expect(result.totalVat).toBe(31);
        expect(result.totalGross).toBe(331);
    });
    it('handles many items without floating point drift', () => {
        const item = { totalNet: 33.33, totalVat: 7.67, totalGross: 41 };
        const items = Array(100).fill(item);
        const result = (0, calculations_1.calculateOfferTotals)(items);
        expect(result.totalNet).toBe(3333);
        expect(result.totalVat).toBe(767);
        expect(result.totalGross).toBe(4100);
    });
});
describe('calculateMarginPercent', () => {
    it('calculates margin for typical values', () => {
        expect((0, calculations_1.calculateMarginPercent)(70, 100)).toBe(30);
    });
    it('returns 0 when selling at cost', () => {
        expect((0, calculations_1.calculateMarginPercent)(100, 100)).toBe(0);
    });
    it('returns 0 when selling price is 0', () => {
        expect((0, calculations_1.calculateMarginPercent)(50, 0)).toBe(0);
    });
    it('returns negative for loss', () => {
        expect((0, calculations_1.calculateMarginPercent)(120, 100)).toBe(-20);
    });
    it('handles 100% margin', () => {
        expect((0, calculations_1.calculateMarginPercent)(0, 500)).toBe(100);
    });
});
describe('calculateMarkupPercent', () => {
    it('calculates markup for typical values', () => {
        expect((0, calculations_1.calculateMarkupPercent)(100, 150)).toBe(50);
    });
    it('returns 0 when cost is 0', () => {
        expect((0, calculations_1.calculateMarkupPercent)(0, 100)).toBe(0);
    });
    it('returns 100% for doubled price', () => {
        expect((0, calculations_1.calculateMarkupPercent)(500, 1000)).toBe(100);
    });
});
describe('grossToNet', () => {
    it('converts gross to net with 23% VAT', () => {
        expect((0, calculations_1.grossToNet)(123, 23)).toBe(100);
    });
    it('converts gross to net with 8% VAT', () => {
        expect((0, calculations_1.grossToNet)(108, 8)).toBe(100);
    });
    it('converts gross to net with 0% VAT', () => {
        expect((0, calculations_1.grossToNet)(100, 0)).toBe(100);
    });
    it('handles fractional results', () => {
        expect((0, calculations_1.grossToNet)(99.99, 23)).toBeCloseTo(81.29, 2);
    });
});
describe('netToGross', () => {
    it('converts net to gross with 23% VAT', () => {
        expect((0, calculations_1.netToGross)(100, 23)).toBe(123);
    });
    it('converts net to gross with 8% VAT', () => {
        expect((0, calculations_1.netToGross)(100, 8)).toBe(108);
    });
    it('converts net to gross with 0% VAT', () => {
        expect((0, calculations_1.netToGross)(100, 0)).toBe(100);
    });
    it('round-trips correctly: net → gross → net', () => {
        const originalNet = 250;
        const gross = (0, calculations_1.netToGross)(originalNet, 23);
        const backToNet = (0, calculations_1.grossToNet)(gross, 23);
        expect(backToNet).toBeCloseTo(originalNet, 2);
    });
});
