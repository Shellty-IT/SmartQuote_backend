"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.round2 = round2;
exports.calculateItemTotals = calculateItemTotals;
exports.calculateOfferTotals = calculateOfferTotals;
exports.calculateMarginPercent = calculateMarginPercent;
exports.calculateMarkupPercent = calculateMarkupPercent;
exports.grossToNet = grossToNet;
exports.netToGross = netToGross;
function round2(value) {
    return Math.round(value * 100) / 100;
}
function calculateItemTotals(item) {
    const discountMultiplier = 1 - item.discount / 100;
    const effectiveUnitPrice = item.unitPrice * discountMultiplier;
    const totalNet = round2(item.quantity * effectiveUnitPrice);
    const totalVat = round2(totalNet * (item.vatRate / 100));
    const totalGross = round2(totalNet + totalVat);
    return { totalNet, totalVat, totalGross };
}
function calculateOfferTotals(items) {
    if (items.length === 0) {
        return { totalNet: 0, totalVat: 0, totalGross: 0 };
    }
    const totalNet = round2(items.reduce((sum, i) => sum + i.totalNet, 0));
    const totalVat = round2(items.reduce((sum, i) => sum + i.totalVat, 0));
    const totalGross = round2(items.reduce((sum, i) => sum + i.totalGross, 0));
    return { totalNet, totalVat, totalGross };
}
function calculateMarginPercent(costNet, sellingNet) {
    if (sellingNet === 0)
        return 0;
    return round2(((sellingNet - costNet) / sellingNet) * 100);
}
function calculateMarkupPercent(costNet, sellingNet) {
    if (costNet === 0)
        return 0;
    return round2(((sellingNet - costNet) / costNet) * 100);
}
function grossToNet(gross, vatRate) {
    return round2(gross / (1 + vatRate / 100));
}
function netToGross(net, vatRate) {
    return round2(net * (1 + vatRate / 100));
}
