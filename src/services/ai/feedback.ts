// smartquote_backend/src/services/ai/feedback.ts
import { GoogleGenAI } from '@google/genai';
import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { aiCache, buildCacheKey } from '../../lib/cache';
import {
    callGemini,
    extractJson,
    isRecord,
    parseClientSelectedSnapshot,
    inferSelectedVariantFromInteractions,
    VariantHistoryStats,
} from './core';
import { buildPostMortemPrompt } from './prompts';

async function getVariantHistoryStats(userId: string): Promise<VariantHistoryStats | null> {
    const acceptedOffers = await prisma.offer.findMany({
        where: { userId, status: 'ACCEPTED' },
        orderBy: { acceptedAt: 'desc' },
        take: 50,
        select: { clientSelectedData: true },
    });

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

    const top = distribution[0] || null;

    return {
        totalAcceptedOffersAnalyzed: acceptedOffers.length,
        totalAcceptedWithVariant: totalWithVariant,
        distribution,
        topVariant: top?.variant || null,
        topVariantShare: top?.share ?? null,
    };
}

export async function generatePostMortem(
    ai: GoogleGenAI | null,
    userId: string,
    offerId: string,
    outcome: 'ACCEPTED' | 'REJECTED'
): Promise<void> {
    const existing = await prisma.offerLegacyInsight.findFirst({
        where: { offerId, userId },
    });

    if (existing) {
        console.log(`⏭️ Post-mortem already exists for offer ${offerId}`);
        return;
    }

    const offer = await prisma.offer.findFirst({
        where: { id: offerId, userId },
        include: {
            items: { orderBy: { position: 'asc' } },
            client: { select: { name: true, company: true, type: true } },
            interactions: { orderBy: { createdAt: 'asc' }, take: 50 },
            comments: { orderBy: { createdAt: 'asc' } },
            views: true,
        },
    });

    if (!offer) {
        console.error(`❌ Post-mortem: offer ${offerId} not found`);
        return;
    }

    const availableVariants = [...new Set(
        offer.items
            .map((i) => i.variantName)
            .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    )];

    const hasVariants = availableVariants.length > 0;

    const selectionSnapshot = parseClientSelectedSnapshot(offer.clientSelectedData);
    const inferredVariant = inferSelectedVariantFromInteractions(offer.interactions);
    const selectedVariant = selectionSnapshot?.selectedVariant ?? inferredVariant ?? null;

    const variantHistory = hasVariants ? await getVariantHistoryStats(userId) : null;

    const fallbackInsight = {
        summary: `Oferta ${offer.number} została ${outcome === 'ACCEPTED' ? 'zaakceptowana' : 'odrzucona'}.`,
        keyLessons: [] as string[],
        pricingInsight: 'Brak danych AI do analizy cenowej.',
        improvementSuggestions: [] as string[],
        industryNote: '',
        selectedVariant,
        availableVariants,
        variantHistory,
    };

    if (!ai) {
        await prisma.offerLegacyInsight.create({
            data: {
                offerId,
                userId,
                outcome,
                insights: fallbackInsight as unknown as Prisma.InputJsonValue,
            },
        });
        return;
    }

    const interactionTimeline = offer.interactions.map(i => ({
        type: i.type,
        createdAt: i.createdAt.toISOString(),
    }));

    const commentsText = offer.comments.map(c =>
        `[${c.author}] ${c.content}`
    ).join('\n') || 'Brak komentarzy';

    const itemsForPrompt = hasVariants && selectedVariant
        ? offer.items.filter((item) => !item.variantName || item.variantName === selectedVariant)
        : offer.items;

    const itemsList = selectionSnapshot?.items && selectionSnapshot.items.length > 0
        ? selectionSnapshot.items.map((item) => {
            const variantPart = item.variantName ? `, wariant: ${item.variantName}` : '';
            const selectedPart = item.isSelected ? '' : ' [odznaczony]';
            return `- ${item.name}: ${item.unitPrice} PLN × ${item.quantity} (VAT ${item.vatRate}%, rabat ${item.discount}%)${variantPart}${selectedPart}`;
        }).join('\n')
        : itemsForPrompt.map(item =>
            `- ${item.name}: ${item.unitPrice} PLN × ${item.quantity} ${item.unit} (VAT ${item.vatRate}%)${item.isOptional ? ' [opcjonalny]' : ''}${item.variantName ? ` [wariant: ${item.variantName}]` : ''}`
        ).join('\n');

    const selectionSummary = selectionSnapshot?.items && selectionSnapshot.items.length > 0
        ? (() => {
            const total = selectionSnapshot.items.length;
            const selected = selectionSnapshot.items.filter(i => i.isSelected).length;
            return `Finalna konfiguracja: ${selected}/${total} pozycji zaznaczonych.`;
        })()
        : 'Brak finalnej konfiguracji (clientSelectedData).';

    const variantBlock = hasVariants
        ? `WARIANTOWANIE (Sales Flexibility):
- Dostępne warianty: ${availableVariants.join(', ') || 'brak'}
- Wybrany wariant klienta: ${selectedVariant ?? 'nieznany / brak'}
${variantHistory
            ? `- Trend (zaakceptowane oferty): ${variantHistory.distribution.map(d => `${d.variant}: ${d.count} (${d.share}%)`).join(', ')}`
            : '- Trend (zaakceptowane oferty): brak danych.'}`
        : `WARIANTOWANIE (Sales Flexibility): brak wariantów w tej ofercie.`;

    const prompt = buildPostMortemPrompt({
        offerNumber: offer.number,
        offerTitle: offer.title,
        outcome,
        clientName: offer.client.name,
        clientCompany: offer.client.company,
        clientType: offer.client.type,
        totalGross: String(offer.totalGross),
        variantBlock,
        selectionSummary,
        itemsList,
        viewCount: offer.views.length,
        interactionTimeline: interactionTimeline.slice(0, 20).map(i => `${i.type} @ ${i.createdAt}`).join('\n'),
        interactionCount: interactionTimeline.length,
        commentsText,
    });

    try {
        const responseText = await callGemini(ai, prompt);
        const parsed: unknown = extractJson(responseText);
        const baseObj: Record<string, unknown> = isRecord(parsed) ? parsed : fallbackInsight;

        const existingLessons = Array.isArray(baseObj.keyLessons)
            ? baseObj.keyLessons
                .map((v: unknown) => String(v))
                .map((s: string) => s.trim())
                .filter((s: string) => s.length > 0)
            : [];

        const shouldAddVariantTrendLesson =
            hasVariants &&
            variantHistory &&
            typeof variantHistory.topVariant === 'string' &&
            typeof variantHistory.topVariantShare === 'number' &&
            variantHistory.totalAcceptedWithVariant >= 3 &&
            variantHistory.topVariantShare >= 50;

        const variantTrendLesson = shouldAddVariantTrendLesson
            ? `Warianty: w zaakceptowanych ofertach najczęściej wybierany jest „${variantHistory!.topVariant}" (${variantHistory!.topVariantShare}%, n=${variantHistory!.totalAcceptedWithVariant}).`
            : null;

        const keyLessons = variantTrendLesson
            ? [variantTrendLesson, ...existingLessons.filter((l) => l !== variantTrendLesson)]
            : existingLessons;

        const improvementSuggestions = Array.isArray(baseObj.improvementSuggestions)
            ? baseObj.improvementSuggestions
                .map((v: unknown) => String(v))
                .map((s: string) => s.trim())
                .filter((s: string) => s.length > 0)
            : fallbackInsight.improvementSuggestions;

        const industryNote = typeof baseObj.industryNote === 'string'
            ? baseObj.industryNote
            : fallbackInsight.industryNote;

        const insightToSave = {
            ...baseObj,
            summary: typeof baseObj.summary === 'string' ? baseObj.summary : fallbackInsight.summary,
            pricingInsight: typeof baseObj.pricingInsight === 'string' ? baseObj.pricingInsight : fallbackInsight.pricingInsight,
            improvementSuggestions,
            industryNote,
            keyLessons,
            selectedVariant,
            availableVariants,
            variantHistory,
        };

        await prisma.offerLegacyInsight.create({
            data: {
                offerId,
                userId,
                outcome,
                insights: insightToSave as unknown as Prisma.InputJsonValue,
            },
        });

        aiCache.invalidatePattern(`price-insight:${userId}`);

        const { notificationService } = await import('../notification.service');
        notificationService.aiInsight(userId, {
            offerId,
            offerNumber: offer.number,
            outcome,
        }).catch((err: unknown) => {
            console.error('❌ AI Insight notification failed:', err);
        });

        console.log(`✅ Post-mortem saved for offer ${offer.number} [${outcome}]`);
    } catch (error: unknown) {
        console.error('❌ Post-mortem AI analysis failed, saving fallback:', error);

        await prisma.offerLegacyInsight.create({
            data: {
                offerId,
                userId,
                outcome,
                insights: fallbackInsight as unknown as Prisma.InputJsonValue,
            },
        });
    }
}

export async function getLatestInsights(userId: string, limit: number = 3) {
    const insights = await prisma.offerLegacyInsight.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
            offer: {
                select: {
                    number: true,
                    title: true,
                    totalGross: true,
                    client: { select: { name: true, company: true } },
                },
            },
        },
    });

    return insights.map(insight => ({
        id: insight.id,
        offerId: insight.offerId,
        offerNumber: insight.offer.number,
        offerTitle: insight.offer.title,
        offerValue: Number(insight.offer.totalGross),
        clientName: insight.offer.client?.name || 'Nieznany',
        outcome: insight.outcome,
        insights: insight.insights as Record<string, unknown>,
        createdAt: insight.createdAt.toISOString(),
    }));
}

export async function getInsightsList(
    userId: string,
    params: {
        page: number;
        limit: number;
        outcome?: 'ACCEPTED' | 'REJECTED';
        dateFrom?: string;
        dateTo?: string;
        search?: string;
    }
): Promise<{ data: Array<Record<string, unknown>>; total: number }> {
    const { page, limit, outcome, dateFrom, dateTo, search } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { userId };

    if (outcome) {
        where.outcome = outcome;
    }

    if (dateFrom || dateTo) {
        const createdAtFilter: Record<string, Date> = {};
        if (dateFrom) {
            createdAtFilter.gte = new Date(dateFrom);
        }
        if (dateTo) {
            const endDate = new Date(dateTo);
            endDate.setHours(23, 59, 59, 999);
            createdAtFilter.lte = endDate;
        }
        where.createdAt = createdAtFilter;
    }

    if (search) {
        where.offer = {
            OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { number: { contains: search, mode: 'insensitive' } },
                { client: { name: { contains: search, mode: 'insensitive' } } },
            ],
        };
    }

    const [insights, total] = await Promise.all([
        prisma.offerLegacyInsight.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: {
                offer: {
                    select: {
                        number: true,
                        title: true,
                        totalGross: true,
                        status: true,
                        currency: true,
                        acceptedAt: true,
                        rejectedAt: true,
                        client: { select: { name: true, company: true } },
                    },
                },
            },
        }),
        prisma.offerLegacyInsight.count({ where }),
    ]);

    const data = insights.map(insight => ({
        id: insight.id,
        offerId: insight.offerId,
        offerNumber: insight.offer.number,
        offerTitle: insight.offer.title,
        offerValue: Number(insight.offer.totalGross),
        offerStatus: insight.offer.status,
        offerCurrency: insight.offer.currency,
        clientName: insight.offer.client?.name || 'Nieznany',
        clientCompany: insight.offer.client?.company || null,
        outcome: insight.outcome,
        insights: insight.insights as Record<string, unknown>,
        resolvedAt: insight.outcome === 'ACCEPTED'
            ? insight.offer.acceptedAt?.toISOString() || null
            : insight.offer.rejectedAt?.toISOString() || null,
        createdAt: insight.createdAt.toISOString(),
    }));

    return { data, total };
}