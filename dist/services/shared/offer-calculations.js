"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateItemTotals = calculateItemTotals;
exports.buildItemWithTotals = buildItemWithTotals;
exports.calculateOfferTotals = calculateOfferTotals;
// smartquote_backend/src/services/shared/offer-calculations.ts
const library_1 = require("@prisma/client/runtime/library");
function calculateItemTotals(item) {
    const quantity = new library_1.Decimal(item.quantity);
    const unitPrice = new library_1.Decimal(item.unitPrice);
    const vatRate = new library_1.Decimal(item.vatRate || 23);
    const discount = new library_1.Decimal(item.discount || 0);
    const discountMultiplier = new library_1.Decimal(1).minus(discount.dividedBy(100));
    const effectiveUnitPrice = unitPrice.times(discountMultiplier);
    const totalNet = quantity.times(effectiveUnitPrice);
    const totalVat = totalNet.times(vatRate.dividedBy(100));
    const totalGross = totalNet.plus(totalVat);
    return {
        totalNet: totalNet.toDecimalPlaces(2),
        totalVat: totalVat.toDecimalPlaces(2),
        totalGross: totalGross.toDecimalPlaces(2),
    };
}
function buildItemWithTotals(item, index) {
    const totals = calculateItemTotals(item);
    return {
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit || 'szt.',
        unitPrice: item.unitPrice,
        vatRate: item.vatRate || 23,
        discount: item.discount || 0,
        totalNet: totals.totalNet,
        totalVat: totals.totalVat,
        totalGross: totals.totalGross,
        position: index,
        isOptional: item.isOptional || false,
        isSelected: true,
        minQuantity: item.minQuantity || 1,
        maxQuantity: item.maxQuantity || 100,
        variantName: item.variantName || null,
    };
}
function calculateOfferTotals(items) {
    const baseItems = items.filter((item) => !item.variantName);
    if (baseItems.length === items.length) {
        return {
            totalNet: items.reduce((sum, item) => sum.plus(item.totalNet), new library_1.Decimal(0)),
            totalVat: items.reduce((sum, item) => sum.plus(item.totalVat), new library_1.Decimal(0)),
            totalGross: items.reduce((sum, item) => sum.plus(item.totalGross), new library_1.Decimal(0)),
        };
    }
    const variantNames = [...new Set(items.filter((i) => i.variantName).map((i) => i.variantName))];
    const firstVariantItems = items.filter((i) => i.variantName === variantNames[0]);
    const allDefaultItems = [...baseItems, ...firstVariantItems];
    return {
        totalNet: allDefaultItems.reduce((sum, item) => sum.plus(item.totalNet), new library_1.Decimal(0)),
        totalVat: allDefaultItems.reduce((sum, item) => sum.plus(item.totalVat), new library_1.Decimal(0)),
        totalGross: allDefaultItems.reduce((sum, item) => sum.plus(item.totalGross), new library_1.Decimal(0)),
    };
}
