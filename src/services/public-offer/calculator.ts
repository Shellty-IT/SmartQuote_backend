// src/services/public-offer/calculator.ts
import { Decimal } from '@prisma/client/runtime/library';

interface OfferItem {
    id: string;
    name: string;
    quantity: Decimal;
    unitPrice: Decimal;
    vatRate: Decimal;
    discount: Decimal | null;
    isOptional: boolean;
    minQuantity: number;
    maxQuantity: number;
    variantName: string | null;
}

interface SelectedItem {
    id: string;
    isSelected: boolean;
    quantity: number;
}

interface CalculationResult {
    readonly netValue: number;
    readonly vatValue: number;
    readonly grossValue: number;
    readonly clientSelectedData: Array<{
        itemId: string;
        name: string;
        isSelected: boolean;
        quantity: number;
        unitPrice: number;
        vatRate: number;
        discount: number;
        netto: number;
        vat: number;
        brutto: number;
        variantName: string | null;
    }>;
}

export class PublicOfferCalculator {
    calculate(
        items: OfferItem[],
        selectedItems: SelectedItem[],
        selectedVariant?: string,
    ): CalculationResult {
        const hasVariants = items.some((item) => item.variantName);
        const visibleItems = hasVariants
            ? items.filter((item) => !item.variantName || item.variantName === selectedVariant)
            : items;

        let totalNet = new Decimal(0);
        let totalVat = new Decimal(0);
        let totalGross = new Decimal(0);

        const clientSelectedData = visibleItems.map((item) => {
            const selection = selectedItems.find((s) => s.id === item.id);
            const isSelected = item.isOptional ? (selection?.isSelected ?? true) : true;

            let quantity = item.quantity;
            if (selection && typeof selection.quantity === 'number' && item.isOptional) {
                const clamped = Math.min(
                    Math.max(selection.quantity, item.minQuantity),
                    item.maxQuantity,
                );
                quantity = new Decimal(clamped);
            }

            const discount = item.discount ?? new Decimal(0);
            const discountMultiplier = new Decimal(1).minus(discount.dividedBy(100));
            const effectivePrice = item.unitPrice.times(discountMultiplier);

            const itemNet = isSelected ? quantity.times(effectivePrice) : new Decimal(0);
            const itemVat = itemNet.times(item.vatRate.dividedBy(100));
            const itemGross = itemNet.plus(itemVat);

            if (isSelected) {
                totalNet = totalNet.plus(itemNet);
                totalVat = totalVat.plus(itemVat);
                totalGross = totalGross.plus(itemGross);
            }

            return {
                itemId: item.id,
                name: item.name,
                isSelected,
                quantity: quantity.toNumber(),
                unitPrice: item.unitPrice.toNumber(),
                vatRate: item.vatRate.toNumber(),
                discount: discount.toNumber(),
                netto: itemNet.toDecimalPlaces(2).toNumber(),
                vat: itemVat.toDecimalPlaces(2).toNumber(),
                brutto: itemGross.toDecimalPlaces(2).toNumber(),
                variantName: item.variantName,
            };
        });

        return {
            netValue: totalNet.toDecimalPlaces(2).toNumber(),
            vatValue: totalVat.toDecimalPlaces(2).toNumber(),
            grossValue: totalGross.toDecimalPlaces(2).toNumber(),
            clientSelectedData,
        };
    }
}

export const publicOfferCalculator = new PublicOfferCalculator();