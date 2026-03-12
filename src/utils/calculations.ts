// smartquote_backend/src/utils/calculations.ts
export interface ItemCalcInput {
    quantity: number;
    unitPrice: number;
    vatRate: number;
    discount: number;
}

export interface ItemCalcResult {
    totalNet: number;
    totalVat: number;
    totalGross: number;
}

export function round2(value: number): number {
    return Math.round(value * 100) / 100;
}

export function calculateItemTotals(item: ItemCalcInput): ItemCalcResult {
    const discountMultiplier = 1 - item.discount / 100;
    const effectiveUnitPrice = item.unitPrice * discountMultiplier;
    const totalNet = round2(item.quantity * effectiveUnitPrice);
    const totalVat = round2(totalNet * (item.vatRate / 100));
    const totalGross = round2(totalNet + totalVat);
    return { totalNet, totalVat, totalGross };
}

export function calculateOfferTotals(items: ItemCalcResult[]): ItemCalcResult {
    if (items.length === 0) {
        return { totalNet: 0, totalVat: 0, totalGross: 0 };
    }
    const totalNet = round2(items.reduce((sum, i) => sum + i.totalNet, 0));
    const totalVat = round2(items.reduce((sum, i) => sum + i.totalVat, 0));
    const totalGross = round2(items.reduce((sum, i) => sum + i.totalGross, 0));
    return { totalNet, totalVat, totalGross };
}

export function calculateMarginPercent(costNet: number, sellingNet: number): number {
    if (sellingNet === 0) return 0;
    return round2(((sellingNet - costNet) / sellingNet) * 100);
}

export function calculateMarkupPercent(costNet: number, sellingNet: number): number {
    if (costNet === 0) return 0;
    return round2(((sellingNet - costNet) / costNet) * 100);
}

export function grossToNet(gross: number, vatRate: number): number {
    return round2(gross / (1 + vatRate / 100));
}

export function netToGross(net: number, vatRate: number): number {
    return round2(net * (1 + vatRate / 100));
}