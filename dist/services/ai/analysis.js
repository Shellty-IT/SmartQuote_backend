"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPriceInsight = getPriceInsight;
exports.getObserverInsight = getObserverInsight;
exports.getClosingStrategy = getClosingStrategy;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const cache_1 = require("../../lib/cache");
const core_1 = require("./core");
const prompts_1 = require("./prompts");
function buildPriceInsightResult(avgPrice, minPrice, maxPrice, count, items, aiSuggestion) {
    return {
        historicalData: { avgPrice, minPrice, maxPrice, count, items },
        aiSuggestion,
    };
}
async function getPriceInsight(ai, userId, itemName, category) {
    const cacheKey = (0, cache_1.buildCacheKey)('price-insight', userId, itemName.toLowerCase().trim(), category || '');
    const cached = cache_1.aiCache.get(cacheKey);
    if (cached) {
        console.log(`🔵 Price Insight cache hit: ${itemName}`);
        return cached;
    }
    const historicalItems = await prisma_1.default.offerItem.findMany({
        where: {
            name: { contains: itemName, mode: 'insensitive' },
            offer: { userId },
        },
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
    const prices = historicalItems.map(item => Number(item.unitPrice));
    const avgPrice = prices.length > 0
        ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100
        : 0;
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const formattedItems = historicalItems.map(item => ({
        name: item.name,
        unitPrice: Number(item.unitPrice),
        quantity: Number(item.quantity),
        unit: item.unit,
        offerTitle: item.offer.title,
        offerStatus: item.offer.status,
        clientName: item.offer.client?.name || 'Nieznany',
        date: item.offer.createdAt.toISOString(),
    }));
    const fallbackSuggestion = {
        suggestedMin: minPrice || 0,
        suggestedMax: maxPrice || 0,
        marketAnalysis: ai ? 'Nie udało się wygenerować analizy AI.' : 'AI nie jest skonfigurowany. Wyświetlono tylko dane historyczne.',
        marginWarning: null,
        confidence: 'low',
    };
    if (!ai) {
        return buildPriceInsightResult(avgPrice, minPrice, maxPrice, historicalItems.length, formattedItems, fallbackSuggestion);
    }
    const legacyInsights = await prisma_1.default.offerLegacyInsight.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { outcome: true, insights: true },
    });
    const historicalSummary = historicalItems.length > 0
        ? `Znaleziono ${historicalItems.length} rekordów.\nŚrednia: ${avgPrice} PLN, Min: ${minPrice} PLN, Max: ${maxPrice} PLN\nSzczegóły:\n${formattedItems.slice(0, 10).map(i => `  ${i.name}: ${i.unitPrice} PLN (${core_1.offerStatusLabels[i.offerStatus] || i.offerStatus}, klient: ${i.clientName})`).join('\n')}`
        : 'Brak danych historycznych dla tej pozycji.';
    const legacySummary = legacyInsights.length > 0
        ? legacyInsights.map(l => {
            const ins = l.insights;
            const selectedVariant = typeof ins.selectedVariant === 'string' ? ins.selectedVariant : null;
            const variantPart = selectedVariant ? ` (wariant: ${selectedVariant})` : '';
            return `[${l.outcome}]${variantPart} ${typeof ins.pricingInsight === 'string' ? ins.pricingInsight : 'brak wniosków cenowych'}`;
        }).join('\n')
        : 'Brak wniosków z poprzednich ofert.';
    const prompt = (0, prompts_1.buildPriceInsightPrompt)(itemName, category, historicalSummary, legacySummary);
    try {
        const responseText = await (0, core_1.callGemini)(ai, prompt);
        const parsed = (0, core_1.extractJson)(responseText);
        const aiResult = parsed || fallbackSuggestion;
        const result = buildPriceInsightResult(avgPrice, minPrice, maxPrice, historicalItems.length, formattedItems, {
            suggestedMin: Number(aiResult.suggestedMin) || minPrice,
            suggestedMax: Number(aiResult.suggestedMax) || maxPrice,
            marketAnalysis: String(aiResult.marketAnalysis || ''),
            marginWarning: aiResult.marginWarning ? String(aiResult.marginWarning) : null,
            confidence: (['low', 'medium', 'high'].includes(String(aiResult.confidence))
                ? aiResult.confidence
                : 'low'),
        });
        cache_1.aiCache.set(cacheKey, result, cache_1.CACHE_TTL.PRICE_INSIGHT);
        return result;
    }
    catch (error) {
        console.error('❌ Price Insight AI failed:', error);
        return buildPriceInsightResult(avgPrice, minPrice, maxPrice, historicalItems.length, formattedItems, { ...fallbackSuggestion, marketAnalysis: 'Wystąpił błąd AI. Wyświetlono tylko dane historyczne.' });
    }
}
function buildTimeAnalysis(views, interactions) {
    const durationsWithValue = views.filter(v => v.duration !== null).map(v => v.duration);
    const avgViewDuration = durationsWithValue.length > 0
        ? Math.round(durationsWithValue.reduce((a, b) => a + b, 0) / durationsWithValue.length)
        : null;
    let mostActiveTime = null;
    const allTimestamps = [
        ...views.map(v => v.viewedAt),
        ...interactions.map(i => i.createdAt),
    ];
    if (allTimestamps.length > 0) {
        const hourCounts = {};
        allTimestamps.forEach(ts => {
            const h = ts.getHours();
            hourCounts[h] = (hourCounts[h] || 0) + 1;
        });
        const topHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
        if (topHour) {
            mostActiveTime = `${topHour[0].padStart(2, '0')}:00`;
        }
    }
    return { totalViews: views.length, avgViewDuration, mostActiveTime };
}
async function getObserverInsight(ai, userId, offerId) {
    const cacheKey = (0, cache_1.buildCacheKey)('observer', userId, offerId);
    const cached = cache_1.aiCache.get(cacheKey);
    if (cached) {
        console.log(`🔵 Observer cache hit: ${offerId}`);
        return cached;
    }
    const offer = await prisma_1.default.offer.findFirst({
        where: { id: offerId, userId },
        include: {
            items: { orderBy: { position: 'asc' } },
            client: { select: { name: true, company: true, type: true } },
            views: { orderBy: { viewedAt: 'asc' } },
            interactions: { orderBy: { createdAt: 'asc' }, take: 100 },
            comments: { orderBy: { createdAt: 'asc' } },
        },
    });
    if (!offer)
        throw new Error('Oferta nie znaleziona');
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
    const clientComments = comments.filter(c => c.author === 'CLIENT');
    if (!ai) {
        const interactionTypes = interactions.map(i => i.type);
        const hasSelections = interactionTypes.some(t => t === 'ITEM_SELECT' || t === 'ITEM_DESELECT');
        const hasComments = clientComments.length > 0;
        return {
            summary: `Klient wyświetlił ofertę ${views.length} razy.${hasSelections ? ' Dokonywał zmian w wybranych pozycjach.' : ''}${hasComments ? ' Zadawał pytania przez komentarze.' : ''}`,
            keyFindings: [
                `Liczba wyświetleń: ${views.length}`,
                `Liczba interakcji: ${interactions.length}`,
                hasComments ? `Klient zostawił ${clientComments.length} komentarzy` : 'Brak komentarzy klienta',
            ].filter(Boolean),
            clientIntent: 'unknown',
            interestAreas: [],
            concerns: [],
            engagementScore: Math.min(10, Math.round((views.length + interactions.length) / 3)),
            timeAnalysis,
        };
    }
    const promptData = {
        offerNumber: offer.number,
        offerTitle: offer.title,
        clientName: offer.client.name,
        clientCompany: offer.client.company,
        clientType: offer.client.type,
        totalGross: String(offer.totalGross),
        statusLabel: core_1.offerStatusLabels[offer.status] || offer.status,
        itemsFormatted: offer.items.map(item => `- ${item.name}: ${item.unitPrice} PLN × ${item.quantity} ${item.unit}${item.isOptional ? ' [opcjonalny]' : ''}${item.isSelected ? '' : ' [odznaczony]'}`).join('\n'),
        viewsFormatted: views.slice(0, 15).map(v => `${v.viewedAt.toISOString()}${v.duration ? ` (${v.duration}s)` : ''}`).join('\n') || 'Brak wyświetleń',
        viewCount: views.length,
        interactionsFormatted: interactions.slice(0, 30).map(i => {
            const details = i.details ? ` — ${JSON.stringify(i.details)}` : '';
            return `${i.type} @ ${i.createdAt.toISOString()}${details}`;
        }).join('\n') || 'Brak interakcji',
        interactionCount: interactions.length,
        clientCommentsFormatted: clientComments.length > 0
            ? clientComments.map(c => `[${c.createdAt.toISOString()}] ${c.content}`).join('\n')
            : 'Brak komentarzy klienta',
        clientCommentCount: clientComments.length,
    };
    const prompt = (0, prompts_1.buildObserverPrompt)(promptData);
    try {
        const responseText = await (0, core_1.callGemini)(ai, prompt);
        const parsed = (0, core_1.extractJson)(responseText);
        if (parsed) {
            const result = {
                summary: String(parsed.summary || ''),
                keyFindings: Array.isArray(parsed.keyFindings) ? parsed.keyFindings.map(String) : [],
                clientIntent: (['likely_accept', 'undecided', 'likely_reject', 'unknown'].includes(String(parsed.clientIntent))
                    ? parsed.clientIntent
                    : 'unknown'),
                interestAreas: Array.isArray(parsed.interestAreas) ? parsed.interestAreas.map(String) : [],
                concerns: Array.isArray(parsed.concerns) ? parsed.concerns.map(String) : [],
                engagementScore: Math.min(10, Math.max(0, Number(parsed.engagementScore) || 0)),
                timeAnalysis,
            };
            cache_1.aiCache.set(cacheKey, result, cache_1.CACHE_TTL.OBSERVER);
            return result;
        }
        throw new Error('Failed to parse Observer response');
    }
    catch (error) {
        console.error('❌ Observer AI failed:', error);
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
async function getClosingStrategy(ai, userId, offerId) {
    const cacheKey = (0, cache_1.buildCacheKey)('closing', userId, offerId);
    const cached = cache_1.aiCache.get(cacheKey);
    if (cached) {
        console.log(`🔵 Closing Strategy cache hit: ${offerId}`);
        return cached;
    }
    let observerContext = null;
    try {
        const observer = await getObserverInsight(ai, userId, offerId);
        observerContext = {
            summary: observer.summary,
            clientIntent: observer.clientIntent,
            concerns: observer.concerns,
            engagementScore: observer.engagementScore,
        };
    }
    catch (err) {
        console.error('❌ Observer failed for Closer, continuing:', err);
    }
    const offer = await prisma_1.default.offer.findFirst({
        where: { id: offerId, userId },
        include: {
            items: { orderBy: { position: 'asc' } },
            client: { select: { name: true, company: true, type: true } },
            comments: { orderBy: { createdAt: 'asc' } },
        },
    });
    if (!offer)
        throw new Error('Oferta nie znaleziona');
    const clientComments = offer.comments.filter(c => c.author === 'CLIENT');
    const sellerComments = offer.comments.filter(c => c.author === 'SELLER');
    const fallbackStrategy = {
        aggressive: {
            title: 'Strategia asertywna',
            description: 'Podkreśl wartość oferty i unikalne korzyści.',
            suggestedResponse: `Dziękuję za zainteresowanie ofertą "${offer.title}". Chciałbym podkreślić, że nasza propozycja zawiera kompletne rozwiązanie dopasowane do Państwa potrzeb. Czy mogę odpowiedzieć na jakieś pytania?`,
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
            suggestedResponse: `W związku z naszą ofertą "${offer.title}" — mogę zaproponować specjalne warunki przy decyzji do końca tygodnia. Czy jest to realne z Państwa strony?`,
            maxDiscountPercent: 5,
        },
        contextSummary: observerContext?.summary || 'Brak danych o zachowaniu klienta.',
    };
    if (!ai) {
        return fallbackStrategy;
    }
    const promptData = {
        offerNumber: offer.number,
        offerTitle: offer.title,
        clientName: offer.client.name,
        clientCompany: offer.client.company,
        clientType: offer.client.type,
        totalGross: String(offer.totalGross),
        itemsFormatted: offer.items.map(item => `- ${item.name}: ${item.unitPrice} PLN × ${item.quantity} ${item.unit} (razem netto: ${item.totalNet} PLN)${item.isOptional ? ' [opcjonalny]' : ''}`).join('\n'),
        observerSummary: observerContext
            ? `Intencja: ${observerContext.clientIntent}, Zaangażowanie: ${observerContext.engagementScore}/10\nObawy: ${observerContext.concerns.join(', ') || 'brak'}\nPodsumowanie: ${observerContext.summary}`
            : 'Brak danych z modułu Observer.',
        clientCommentsText: clientComments.length > 0
            ? clientComments.map(c => c.content).join('\n')
            : 'Brak komentarzy klienta',
        sellerCommentsText: sellerComments.length > 0
            ? sellerComments.map(c => c.content).join('\n')
            : 'Brak odpowiedzi sprzedawcy',
    };
    const prompt = (0, prompts_1.buildClosingStrategyPrompt)(promptData);
    try {
        const responseText = await (0, core_1.callGemini)(ai, prompt);
        const parsed = (0, core_1.extractJson)(responseText);
        if (parsed) {
            const aggressive = parsed.aggressive;
            const partnership = parsed.partnership;
            const quickClose = parsed.quickClose;
            const result = {
                aggressive: {
                    title: String(aggressive?.title || 'Strategia asertywna'),
                    description: String(aggressive?.description || ''),
                    suggestedResponse: String(aggressive?.suggestedResponse || ''),
                    riskLevel: (['low', 'medium', 'high'].includes(String(aggressive?.riskLevel))
                        ? aggressive.riskLevel
                        : 'medium'),
                },
                partnership: {
                    title: String(partnership?.title || 'Podejście partnerskie'),
                    description: String(partnership?.description || ''),
                    suggestedResponse: String(partnership?.suggestedResponse || ''),
                    proposedConcessions: Array.isArray(partnership?.proposedConcessions)
                        ? partnership.proposedConcessions.map(String)
                        : [],
                },
                quickClose: {
                    title: String(quickClose?.title || 'Szybkie domknięcie'),
                    description: String(quickClose?.description || ''),
                    suggestedResponse: String(quickClose?.suggestedResponse || ''),
                    maxDiscountPercent: Math.min(15, Math.max(0, Number(quickClose?.maxDiscountPercent) || 5)),
                },
                contextSummary: String(parsed.contextSummary || observerContext?.summary || ''),
            };
            cache_1.aiCache.set(cacheKey, result, cache_1.CACHE_TTL.CLOSING_STRATEGY);
            return result;
        }
        throw new Error('Failed to parse Closer response');
    }
    catch (error) {
        console.error('❌ Closing Strategy AI failed:', error);
        return fallbackStrategy;
    }
}
