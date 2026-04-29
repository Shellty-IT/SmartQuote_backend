// src/services/ai/feedback.helpers.ts
import { VariantHistoryStats, parseClientSelectedSnapshot } from './core';
import { feedbackRepository } from '../../repositories/feedback.repository';

type PostMortemOffer = NonNullable<
    Awaited<ReturnType<typeof feedbackRepository.findOfferForPostMortem>>
>;

export function buildVariantHistoryStats(
    acceptedOffers: Array<{ clientSelectedData: unknown }>,
): VariantHistoryStats | null {
    const counts: Record<string, number> = {};
    let totalWithVariant = 0;

    for (const o of acceptedOffers) {
        const snapshot = parseClientSelectedSnapshot(o.clientSelectedData);
        const sv = snapshot?.selectedVariant;
        if (!sv) continue;

        totalWithVariant += 1;
        counts[sv] = (counts[sv] || 0) + 1;
    }

    if (totalWithVariant === 0) return null;

    const distribution = Object.entries(counts)
        .map(([variant, count]) => ({
            variant,
            count,
            share: Math.round((count / totalWithVariant) * 1000) / 10,
        }))
        .sort((a, b) => b.count - a.count);

    const top = distribution[0] ?? null;

    return {
        totalAcceptedOffersAnalyzed: acceptedOffers.length,
        totalAcceptedWithVariant: totalWithVariant,
        distribution,
        topVariant: top?.variant ?? null,
        topVariantShare: top?.share ?? null,
    };
}

export function buildItemsList(offer: PostMortemOffer, selectedVariant: string | null): string {
    const snapshot = parseClientSelectedSnapshot(offer.clientSelectedData);

    if (snapshot?.items && snapshot.items.length > 0) {
        return snapshot.items.map((item) => {
            const variantPart = item.variantName ? `, wariant: ${item.variantName}` : '';
            const selectedPart = item.isSelected ? '' : ' [odznaczony]';
            return `- ${item.name}: ${item.unitPrice} PLN × ${item.quantity} (VAT ${item.vatRate}%, rabat ${item.discount}%)${variantPart}${selectedPart}`;
        }).join('\n');
    }

    const availableVariants = [
        ...new Set(
            offer.items
                .map((i) => i.variantName)
                .filter((v): v is string => typeof v === 'string' && v.trim().length > 0),
        ),
    ];

    const itemsForPrompt = availableVariants.length > 0 && selectedVariant
        ? offer.items.filter((item) => !item.variantName || item.variantName === selectedVariant)
        : offer.items;

    return itemsForPrompt.map((item) =>
        `- ${item.name}: ${item.unitPrice} PLN × ${item.quantity} ${item.unit} (VAT ${item.vatRate}%)` +
        `${item.isOptional ? ' [opcjonalny]' : ''}` +
        `${item.variantName ? ` [wariant: ${item.variantName}]` : ''}`,
    ).join('\n');
}

export function buildSelectionSummary(offer: PostMortemOffer): string {
    const snapshot = parseClientSelectedSnapshot(offer.clientSelectedData);
    if (!snapshot?.items || snapshot.items.length === 0) {
        return 'Brak finalnej konfiguracji (clientSelectedData).';
    }
    const total = snapshot.items.length;
    const selected = snapshot.items.filter((i) => i.isSelected).length;
    return `Finalna konfiguracja: ${selected}/${total} pozycji zaznaczonych.`;
}

export function buildVariantBlock(
    availableVariants: string[],
    selectedVariant: string | null,
    variantHistory: VariantHistoryStats | null,
): string {
    if (availableVariants.length === 0) {
        return 'WARIANTOWANIE (Sales Flexibility): brak wariantów w tej ofercie.';
    }

    const trendLine = variantHistory
        ? `- Trend (zaakceptowane oferty): ${variantHistory.distribution.map((d) => `${d.variant}: ${d.count} (${d.share}%)`).join(', ')}`
        : '- Trend (zaakceptowane oferty): brak danych.';

    return [
        'WARIANTOWANIE (Sales Flexibility):',
        `- Dostępne warianty: ${availableVariants.join(', ') || 'brak'}`,
        `- Wybrany wariant klienta: ${selectedVariant ?? 'nieznany / brak'}`,
        trendLine,
    ].join('\n');
}

export function buildKeyLessons(
    baseObj: Record<string, unknown>,
    variantHistory: VariantHistoryStats | null,
    hasVariants: boolean,
): string[] {
    const existingLessons = Array.isArray(baseObj.keyLessons)
        ? baseObj.keyLessons.map((v: unknown) => String(v).trim()).filter((s) => s.length > 0)
        : [];

    const shouldAddVariantLesson =
        hasVariants &&
        variantHistory &&
        typeof variantHistory.topVariant === 'string' &&
        typeof variantHistory.topVariantShare === 'number' &&
        variantHistory.totalAcceptedWithVariant >= 3 &&
        variantHistory.topVariantShare >= 50;

    if (!shouldAddVariantLesson || !variantHistory) return existingLessons;

    const variantLesson = `Warianty: w zaakceptowanych ofertach najczęściej wybierany jest „${variantHistory.topVariant}" (${variantHistory.topVariantShare}%, n=${variantHistory.totalAcceptedWithVariant}).`;

    return [variantLesson, ...existingLessons.filter((l) => l !== variantLesson)];
}