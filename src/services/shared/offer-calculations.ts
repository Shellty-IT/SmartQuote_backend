// src/services/shared/offer-calculations.ts

import { Decimal } from '@prisma/client/runtime/library';
import { OfferItemInput } from '../../types';

interface ItemCalculation {
    readonly quantity: number;
    readonly unitPrice: number;
    readonly vatRate?: number;
    readonly discount?: number;
}

interface ItemTotals {
    readonly totalNet: Decimal;
    readonly totalVat: Decimal;
    readonly totalGross: Decimal;
}

export interface ItemWithTotals {
    readonly name: string;
    readonly description?: string | null;
    readonly quantity: number;
    readonly unit: string;
    readonly unitPrice: number;
    readonly vatRate: number;
    readonly discount: number;
    readonly totalNet: Decimal;
    readonly totalVat: Decimal;
    readonly totalGross: Decimal;
    readonly position: number;
    readonly isOptional: boolean;
    readonly isSelected: boolean;
    readonly minQuantity?: number | null;
    readonly maxQuantity?: number | null;
    readonly variantName: string | null;
}

export function calculateItemTotals(item: ItemCalculation): ItemTotals {
    const quantity = new Decimal(item.quantity);
    const unitPrice = new Decimal(item.unitPrice);
    const vatRate = new Decimal(item.vatRate || 23);
    const discount = new Decimal(item.discount || 0);

    const discountMultiplier = new Decimal(1).minus(discount.dividedBy(100));
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

export function buildItemWithTotals(item: OfferItemInput, index: number): ItemWithTotals {
    const totals = calculateItemTotals(item);
    return {
        name: item.name,
        description: item.description ?? null,
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
        minQuantity: item.minQuantity ?? null,
        maxQuantity: item.maxQuantity ?? null,
        variantName: item.variantName || null,
    };
}

export function calculateOfferTotals(items: ItemWithTotals[]): ItemTotals {
    const baseItems = items.filter((item) => !item.variantName);

    if (baseItems.length === items.length) {
        return {
            totalNet: items.reduce((sum, item) => sum.plus(item.totalNet), new Decimal(0)),
            totalVat: items.reduce((sum, item) => sum.plus(item.totalVat), new Decimal(0)),
            totalGross: items.reduce((sum, item) => sum.plus(item.totalGross), new Decimal(0)),
        };
    }

    const variantNames = [...new Set(
        items.filter((i) => i.variantName).map((i) => i.variantName!)
    )];
    const firstVariantItems = items.filter((i) => i.variantName === variantNames[0]);
    const allDefaultItems = [...baseItems, ...firstVariantItems];

    return {
        totalNet: allDefaultItems.reduce((sum, item) => sum.plus(item.totalNet), new Decimal(0)),
        totalVat: allDefaultItems.reduce((sum, item) => sum.plus(item.totalVat), new Decimal(0)),
        totalGross: allDefaultItems.reduce((sum, item) => sum.plus(item.totalGross), new Decimal(0)),
    };
}