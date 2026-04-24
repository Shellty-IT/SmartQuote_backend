// src/services/ai/analysis.ts
import { GoogleGenAI } from '@google/genai';
import prisma from '../../lib/prisma';
import { aiCache, CACHE_TTL, buildCacheKey } from '../../lib/cache';
import { callGemini, extractJson, offerStatusLabels } from './core';
import {
    buildPriceInsightPrompt,
    buildObserverPrompt,
    buildClosingStrategyPrompt,
    ObserverPromptData,
} from './prompts';

interface PriceInsightAISuggestion {
    readonly suggestedMin: number;
    readonly suggestedMax: number;
    readonly marketAnalysis: string;
    readonly marginWarning: string | null;
    readonly confidence: 'low' | 'medium' | 'high';
}

interface PriceInsightHistoricalItem {
    readonly name: string;
    readonly unitPrice: number;
    readonly quantity: number;
    readonly unit: string;
    readonly offerTitle: string;
    readonly offerStatus: string;
    readonly clientName: string;
    readonly date: string;
}

interface PriceInsightResult {
    readonly historicalData: {
        readonly avgPrice: number;
        readonly minPrice: number;
        readonly maxPrice: number;
        readonly count: number;
        readonly items: PriceInsightHistoricalItem[];
    };
    readonly aiSuggestion: PriceInsightAISuggestion;
}

interface ObserverResult {
    readonly summary: string;
    readonly keyFindings: string[];
    readonly clientIntent: 'likely_accept' | 'undecided' | 'likely_reject' | 'unknown';
    readonly interestAreas: string[];
    readonly concerns: string[];
    readonly engagementScore: number;
    readonly timeAnalysis: {
        readonly totalViews: number;
        readonly avgViewDuration: number | null;
        readonly mostActiveTime: string | null;
    };
}

interface ClosingStrategyResult {
    readonly aggressive: {
        readonly title: string;
        readonly description: string;
        readonly suggestedResponse: string;
        readonly riskLevel: 'low' | 'medium' | 'high';
    };
    readonly partnership: {
        readonly title: string;
        readonly description: string;
        readonly suggestedResponse: string;
        readonly proposedConcessions: string[];
    };
    readonly quickClose: {
        readonly title: string;
        readonly description: string;
        readonly suggestedResponse: string;
        readonly maxDiscountPercent: number;
    };
    readonly contextSummary: string;
}

function buildPriceInsightResult(
    avgPrice: number,
    minPrice: number,
    maxPrice: number,
    count: number,
    items: PriceInsightHistoricalItem[],
    aiSuggestion: PriceInsightAISuggestion,
): PriceInsightResult {
    return { historicalData: { avgPrice, minPrice, maxPrice, count, items }, aiSuggestion };
}

function computeAvgPrice(prices: number[]): number {
    if (prices.length === 0) return 0;
    return Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100;
}

function buildTimeAnalysis(
    views: Array<{ viewedAt: Date; duration: number | null }>,
    interactions: Array<{ createdAt: Date }>,
): ObserverResult['timeAnalysis'] {
    const durationsWithValue = views.filter((v) => v.duration !== null).map((v) => v.duration!);
    const avgViewDuration =
        durationsWithValue.length > 0
            ? Math.round(durationsWithValue.reduce((a, b) => a + b, 0) / durationsWithValue.length)
            : null;

    let mostActiveTime: string | null = null;
    const allTimestamps = [...views.map((v) => v.viewedAt), ...interactions.map((i) => i.createdAt)];

    if (allTimestamps.length > 0) {
        const hourCounts: Record<number, number> = {};
        for (const ts of allTimestamps) {
            const h = ts.getHours();
            hourCounts[h] = (hourCounts[h] ?? 0) + 1;
        }
        const topHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
        if (topHour) {
            mostActiveTime = `${topHour[0].padStart(2, '0')}:00`;
        }
    }

    return { totalViews: views.length, avgViewDuration, mostActiveTime };
}

function parseConfidence(value: unknown): 'low' | 'medium' | 'high' {
    return (['low', 'medium', 'high'] as const).includes(value as 'low' | 'medium' | 'high')
        ? (value as 'low' | 'medium' | 'high')
        : 'low';
}

function parseClientIntent(value: unknown): ObserverResult['clientIntent'] {
    const valid = ['likely_accept', 'undecided', 'likely_reject', 'unknown'] as const;
    return valid.includes(value as ObserverResult['clientIntent'])
        ? (value as ObserverResult['clientIntent'])
        : 'unknown';
}

function parseRiskLevel(value: unknown): 'low' | 'medium' | 'high' {
    return (['low', 'medium', 'high'] as const).includes(value as 'low' | 'medium' | 'high')
        ? (value as 'low' | 'medium' | 'high')
        : 'medium';
}

export async function getPriceInsight(
    ai: GoogleGenAI | null,
    userId: string,
    itemName: string,
    category?: string,
): Promise<PriceInsightResult> {
    const cacheKey = buildCacheKey('price-insight', userId, itemName.toLowerCase().trim(), category ?? '');
    const cached = aiCache.get<PriceInsightResult>(cacheKey);
    if (cached) return cached;

    const historicalItems = await prisma.offerItem.findMany({
        where: { name: { contains: itemName, mode: 'insensitive' }, offer: { userId } },
        include: {
            offer: {
                select: {
                    title: true,
                    status: true,
                    createdAt: true,
                    client: { select: { name: true } },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
    });

    const prices = historicalItems.map((item) => Number(item.unitPrice));
    const avgPrice = computeAvgPrice(prices);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    const formattedItems: PriceInsightHistoricalItem[] = historicalItems.map((item) => ({
        name: item.name,
        unitPrice: Number(item.unitPrice),
        quantity: Number(item.quantity),
        unit: item.unit,
        offerTitle: item.offer.title,
        offerStatus: item.offer.status,
        clientName: item.offer.client?.name ?? 'Nieznany',
        date: item.offer.createdAt.toISOString(),
    }));

    const fallbackSuggestion: PriceInsightAISuggestion = {
        suggestedMin: minPrice,
        suggestedMax: maxPrice,
        marketAnalysis: ai
            ? 'Nie udało się wygenerować analizy AI.'
            : 'AI nie jest skonfigurowany. Wyświetlono tylko dane historyczne.',
        marginWarning: null,
        confidence: 'low',
    };

    if (!ai) {
        return buildPriceInsightResult(
            avgPrice,
            minPrice,
            maxPrice,
            historicalItems.length,
            formattedItems,
            fallbackSuggestion,
        );
    }

    const legacyInsights = await prisma.offerLegacyInsight.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { outcome: true, insights: true },
    });

    const historicalSummary =
        historicalItems.length > 0
            ? `Znaleziono ${historicalItems.length} rekordów.\nŚrednia: ${avgPrice} PLN, Min: ${minPrice} PLN, Max: ${maxPrice} PLN\nSzczegóły:\n${formattedItems
                .slice(0, 10)
                .map(
                    (i) =>
                        `  ${i.name}: ${i.unitPrice} PLN (${offerStatusLabels[i.offerStatus] ?? i.offerStatus}, klient: ${i.clientName})`,
                )
                .join('\n')}`
            : 'Brak danych historycznych dla tej pozycji.';

    const legacySummary =
        legacyInsights.length > 0
            ? legacyInsights
                .map((l) => {
                    const ins = l.insights as Record<string, unknown>;
                    const selectedVariant =
                        typeof ins.selectedVariant === 'string' ? ins.selectedVariant : null;
                    const variantPart = selectedVariant ? ` (wariant: ${selectedVariant})` : '';
                    return `[${l.outcome}]${variantPart} ${typeof ins.pricingInsight === 'string' ? ins.pricingInsight : 'brak wniosków cenowych'}`;
                })
                .join('\n')
            : 'Brak wniosków z poprzednich ofert.';

    const prompt = buildPriceInsightPrompt(itemName, category, historicalSummary, legacySummary);

    try {
        const responseText = await callGemini(ai, prompt);
        const parsed = extractJson(responseText) as Record<string, unknown> | null;
        const aiResult = parsed ?? fallbackSuggestion;

        const result = buildPriceInsightResult(
            avgPrice,
            minPrice,
            maxPrice,
            historicalItems.length,
            formattedItems,
            {
                suggestedMin: Number(aiResult.suggestedMin) || minPrice,
                suggestedMax: Number(aiResult.suggestedMax) || maxPrice,
                marketAnalysis: String(aiResult.marketAnalysis ?? ''),
                marginWarning: aiResult.marginWarning ? String(aiResult.marginWarning) : null,
                confidence: parseConfidence(aiResult.confidence),
            },
        );

        aiCache.set(cacheKey, result, CACHE_TTL.PRICE_INSIGHT);
        return result;
    } catch {
        return buildPriceInsightResult(avgPrice, minPrice, maxPrice, historicalItems.length, formattedItems, {
            ...fallbackSuggestion,
            marketAnalysis: 'Wystąpił błąd AI. Wyświetlono tylko dane historyczne.',
        });
    }
}

export async function getObserverInsight(
    ai: GoogleGenAI | null,
    userId: string,
    offerId: string,
): Promise<ObserverResult> {
    const cacheKey = buildCacheKey('observer', userId, offerId);
    const cached = aiCache.get<ObserverResult>(cacheKey);
    if (cached) return cached;

    const offer = await prisma.offer.findFirst({
        where: { id: offerId, userId },
        include: {
            items: { orderBy: { position: 'asc' } },
            client: { select: { name: true, company: true, type: true } },
            views: { orderBy: { viewedAt: 'asc' } },
            interactions: { orderBy: { createdAt: 'asc' }, take: 100 },
            comments: { orderBy: { createdAt: 'asc' } },
        },
    });

    if (!offer) throw new Error('Oferta nie znaleziona');

    const { views, interactions, comments } = offer;
    const timeAnalysis = buildTimeAnalysis(views, interactions);

    if (views.length === 0 && interactions.length === 0) {
        return {
            summary: 'Brak danych o aktywności klienta na tej ofercie. Oferta nie została jeszcze wyświetlona.',
            keyFindings: ['Oferta nie została jeszcze otwarta przez klienta'],
            clientIntent: 'unknown',
            interestAreas: [],
            concerns: [],
            engagementScore: 0,
            timeAnalysis,
        };
    }

    const clientComments = comments.filter((c) => c.author === 'CLIENT');

    if (!ai) {
        const hasSelections = interactions.some(
            (i) => i.type === 'ITEM_SELECT' || i.type === 'ITEM_DESELECT',
        );
        const hasComments = clientComments.length > 0;

        return {
            summary: `Klient wyświetlił ofertę ${views.length} razy.${hasSelections ? ' Dokonywał zmian w wybranych pozycjach.' : ''}${hasComments ? ' Zadawał pytania przez komentarze.' : ''}`,
            keyFindings: [
                `Liczba wyświetleń: ${views.length}`,
                `Liczba interakcji: ${interactions.length}`,
                hasComments
                    ? `Klient zostawił ${clientComments.length} komentarzy`
                    : 'Brak komentarzy klienta',
            ],
            clientIntent: 'unknown',
            interestAreas: [],
            concerns: [],
            engagementScore: Math.min(10, Math.round((views.length + interactions.length) / 3)),
            timeAnalysis,
        };
    }

    const promptData: ObserverPromptData = {
        offerNumber: offer.number,
        offerTitle: offer.title,
        clientName: offer.client.name,
        clientCompany: offer.client.company,
        clientType: offer.client.type,
        totalGross: String(offer.totalGross),
        statusLabel: offerStatusLabels[offer.status] ?? offer.status,
        itemsFormatted: offer.items
            .map(
                (item) =>
                    `- ${item.name}: ${item.unitPrice} PLN × ${item.quantity} ${item.unit}${item.isOptional ? ' [opcjonalny]' : ''}${item.isSelected ? '' : ' [odznaczony]'}`,
            )
            .join('\n'),
        viewsFormatted:
            views
                .slice(0, 15)
                .map((v) => `${v.viewedAt.toISOString()}${v.duration ? ` (${v.duration}s)` : ''}`)
                .join('\n') || 'Brak wyświetleń',
        viewCount: views.length,
        interactionsFormatted:
            interactions
                .slice(0, 30)
                .map((i) => {
                    const details = i.details ? ` — ${JSON.stringify(i.details)}` : '';
                    return `${i.type} @ ${i.createdAt.toISOString()}${details}`;
                })
                .join('\n') || 'Brak interakcji',
        interactionCount: interactions.length,
        clientCommentsFormatted:
            clientComments.length > 0
                ? clientComments
                    .map((c) => `[${c.createdAt.toISOString()}] ${c.content}`)
                    .join('\n')
                : 'Brak komentarzy klienta',
        clientCommentCount: clientComments.length,
    };

    const prompt = buildObserverPrompt(promptData);

    try {
        const responseText = await callGemini(ai, prompt);
        const parsed = extractJson(responseText) as Record<string, unknown> | null;

        if (!parsed) throw new Error('Failed to parse Observer response');

        const result: ObserverResult = {
            summary: String(parsed.summary ?? ''),
            keyFindings: Array.isArray(parsed.keyFindings) ? parsed.keyFindings.map(String) : [],
            clientIntent: parseClientIntent(parsed.clientIntent),
            interestAreas: Array.isArray(parsed.interestAreas)
                ? parsed.interestAreas.map(String)
                : [],
            concerns: Array.isArray(parsed.concerns) ? parsed.concerns.map(String) : [],
            engagementScore: Math.min(10, Math.max(0, Number(parsed.engagementScore) || 0)),
            timeAnalysis,
        };

        aiCache.set(cacheKey, result, CACHE_TTL.OBSERVER);
        return result;
    } catch {
        return {
            summary: `Klient wyświetlił ofertę ${views.length} razy i wykonał ${interactions.length} interakcji. Analiza AI jest tymczasowo niedostępna.`,
            keyFindings: [`${views.length} wyświetleń`, `${interactions.length} interakcji`],
            clientIntent: 'unknown',
            interestAreas: [],
            concerns: [],
            engagementScore: Math.min(10, Math.round((views.length + interactions.length) / 3)),
            timeAnalysis,
        };
    }
}

function buildFallbackClosingStrategy(
    offerTitle: string,
    offerNumber: string,
    contextSummary: string,
): ClosingStrategyResult {
    return {
        aggressive: {
            title: 'Strategia asertywna',
            description: 'Podkreśl wartość oferty i unikalne korzyści.',
            suggestedResponse: `Dziękuję za zainteresowanie ofertą "${offerTitle}". Chciałbym podkreślić, że nasza propozycja zawiera kompletne rozwiązanie dopasowane do Państwa potrzeb. Czy mogę odpowiedzieć na jakieś pytania?`,
            riskLevel: 'medium',
        },
        partnership: {
            title: 'Podejście partnerskie',
            description: 'Zaproponuj wspólne dopasowanie oferty do potrzeb.',
            suggestedResponse: `Cieszę się, że zapoznali się Państwo z naszą ofertą. Chętnie omówię możliwości dopasowania zakresu do Państwa budżetu i priorytetów. Kiedy moglibyśmy porozmawiać?`,
            proposedConcessions: ['Elastyczne warunki płatności', 'Etapowa realizacja'],
        },
        quickClose: {
            title: 'Szybkie domknięcie',
            description: 'Zaproponuj zachętę do szybkiej decyzji.',
            suggestedResponse: `W związku z naszą ofertą "${offerNumber}" — mogę zaproponować specjalne warunki przy decyzji do końca tygodnia. Czy jest to realne z Państwa strony?`,
            maxDiscountPercent: 5,
        },
        contextSummary,
    };
}

export async function getClosingStrategy(
    ai: GoogleGenAI | null,
    userId: string,
    offerId: string,
): Promise<ClosingStrategyResult> {
    const cacheKey = buildCacheKey('closing', userId, offerId);
    const cached = aiCache.get<ClosingStrategyResult>(cacheKey);
    if (cached) return cached;

    let observerContext: {
        summary: string;
        clientIntent: string;
        concerns: string[];
        engagementScore: number;
    } | null = null;

    try {
        const observer = await getObserverInsight(ai, userId, offerId);
        observerContext = {
            summary: observer.summary,
            clientIntent: observer.clientIntent,
            concerns: observer.concerns,
            engagementScore: observer.engagementScore,
        };
    } catch {
    }

    const offer = await prisma.offer.findFirst({
        where: { id: offerId, userId },
        include: {
            items: { orderBy: { position: 'asc' } },
            client: { select: { name: true, company: true, type: true } },
            comments: { orderBy: { createdAt: 'asc' } },
        },
    });

    if (!offer) throw new Error('Oferta nie znaleziona');

    const fallback = buildFallbackClosingStrategy(
        offer.title,
        offer.number,
        observerContext?.summary ?? 'Brak danych o zachowaniu klienta.',
    );

    if (!ai) return fallback;

    const clientComments = offer.comments.filter((c) => c.author === 'CLIENT');
    const sellerComments = offer.comments.filter((c) => c.author === 'SELLER');

    const promptData = {
        offerNumber: offer.number,
        offerTitle: offer.title,
        clientName: offer.client.name,
        clientCompany: offer.client.company,
        clientType: offer.client.type,
        totalGross: String(offer.totalGross),
        itemsFormatted: offer.items
            .map(
                (item) =>
                    `- ${item.name}: ${item.unitPrice} PLN × ${item.quantity} ${item.unit} (razem netto: ${item.totalNet} PLN)${item.isOptional ? ' [opcjonalny]' : ''}`,
            )
            .join('\n'),
        observerSummary: observerContext
            ? `Intencja: ${observerContext.clientIntent}, Zaangażowanie: ${observerContext.engagementScore}/10\nObawy: ${observerContext.concerns.join(', ') || 'brak'}\nPodsumowanie: ${observerContext.summary}`
            : 'Brak danych z modułu Observer.',
        clientCommentsText:
            clientComments.length > 0
                ? clientComments.map((c) => c.content).join('\n')
                : 'Brak komentarzy klienta',
        sellerCommentsText:
            sellerComments.length > 0
                ? sellerComments.map((c) => c.content).join('\n')
                : 'Brak odpowiedzi sprzedawcy',
    };

    const prompt = buildClosingStrategyPrompt(promptData);

    try {
        const responseText = await callGemini(ai, prompt);
        const parsed = extractJson(responseText) as Record<string, unknown> | null;

        if (!parsed) throw new Error('Failed to parse Closer response');

        const aggressive = parsed.aggressive as Record<string, unknown> | undefined;
        const partnership = parsed.partnership as Record<string, unknown> | undefined;
        const quickClose = parsed.quickClose as Record<string, unknown> | undefined;

        const result: ClosingStrategyResult = {
            aggressive: {
                title: String(aggressive?.title ?? 'Strategia asertywna'),
                description: String(aggressive?.description ?? ''),
                suggestedResponse: String(aggressive?.suggestedResponse ?? ''),
                riskLevel: parseRiskLevel(aggressive?.riskLevel),
            },
            partnership: {
                title: String(partnership?.title ?? 'Podejście partnerskie'),
                description: String(partnership?.description ?? ''),
                suggestedResponse: String(partnership?.suggestedResponse ?? ''),
                proposedConcessions: Array.isArray(partnership?.proposedConcessions)
                    ? (partnership!.proposedConcessions as unknown[]).map(String)
                    : [],
            },
            quickClose: {
                title: String(quickClose?.title ?? 'Szybkie domknięcie'),
                description: String(quickClose?.description ?? ''),
                suggestedResponse: String(quickClose?.suggestedResponse ?? ''),
                maxDiscountPercent: Math.min(
                    15,
                    Math.max(0, Number(quickClose?.maxDiscountPercent) || 5),
                ),
            },
            contextSummary: String(parsed.contextSummary ?? observerContext?.summary ?? ''),
        };

        aiCache.set(cacheKey, result, CACHE_TTL.CLOSING_STRATEGY);
        return result;
    } catch {
        return fallback;
    }
}