// smartquote_backend/src/utils/contentHash.ts

import crypto from 'crypto';

interface HashableItem {
    readonly name: string;
    readonly quantity: number;
    readonly unitPrice: number;
    readonly vatRate: number;
    readonly discount: number;
    readonly isSelected: boolean;
    readonly variantName?: string | null;
}

interface HashInput {
    readonly offerNumber: string;
    readonly items: readonly HashableItem[];
    readonly selectedVariant?: string | null;
    readonly totalNet: number;
    readonly totalVat: number;
    readonly totalGross: number;
    readonly currency: string;
}

export function generateContentHash(input: HashInput): string {
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

    return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
}

export function verifyContentHash(input: HashInput, expectedHash: string): boolean {
    const computedHash = generateContentHash(input);
    return crypto.timingSafeEqual(
        Buffer.from(computedHash, 'hex'),
        Buffer.from(expectedHash, 'hex')
    );
}