"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePostMortem = generatePostMortem;
exports.getLatestInsights = getLatestInsights;
exports.getInsightsList = getInsightsList;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const cache_1 = require("../../lib/cache");
const core_1 = require("./core");
const prompts_1 = require("./prompts");
async function getVariantHistoryStats(userId) {
    const acceptedOffers = await prisma_1.default.offer.findMany({
        where: { userId, status: 'ACCEPTED' },
        orderBy: { acceptedAt: 'desc' },
        take: 50,
        select: { clientSelectedData: true },
    });
    const counts = {};
    let totalWithVariant = 0;
    for (const o of acceptedOffers) {
        const snapshot = (0, core_1.parseClientSelectedSnapshot)(o.clientSelectedData);
        const sv = snapshot?.selectedVariant;
        if (!sv)
            continue;
        totalWithVariant += 1;
        counts[sv] = (counts[sv] || 0) + 1;
    }
    if (totalWithVariant === 0)
        return null;
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
async function generatePostMortem(ai, userId, offerId, outcome) {
    const existing = await prisma_1.default.offerLegacyInsight.findFirst({
        where: { offerId, userId },
    });
    if (existing) {
        console.log(`⏭️ Post-mortem already exists for offer ${offerId}`);
        return;
    }
    const offer = await prisma_1.default.offer.findFirst({
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
    const availableVariants = [...new Set(offer.items
            .map((i) => i.variantName)
            .filter((v) => typeof v === 'string' && v.trim().length > 0))];
    const hasVariants = availableVariants.length > 0;
    const selectionSnapshot = (0, core_1.parseClientSelectedSnapshot)(offer.clientSelectedData);
    const inferredVariant = (0, core_1.inferSelectedVariantFromInteractions)(offer.interactions);
    const selectedVariant = selectionSnapshot?.selectedVariant ?? inferredVariant ?? null;
    const variantHistory = hasVariants ? await getVariantHistoryStats(userId) : null;
    const fallbackInsight = {
        summary: `Oferta ${offer.number} została ${outcome === 'ACCEPTED' ? 'zaakceptowana' : 'odrzucona'}.`,
        keyLessons: [],
        pricingInsight: 'Brak danych AI do analizy cenowej.',
        improvementSuggestions: [],
        industryNote: '',
        selectedVariant,
        availableVariants,
        variantHistory,
    };
    if (!ai) {
        await prisma_1.default.offerLegacyInsight.create({
            data: {
                offerId,
                userId,
                outcome,
                insights: fallbackInsight,
            },
        });
        return;
    }
    const interactionTimeline = offer.interactions.map(i => ({
        type: i.type,
        createdAt: i.createdAt.toISOString(),
    }));
    const commentsText = offer.comments.map(c => `[${c.author}] ${c.content}`).join('\n') || 'Brak komentarzy';
    const itemsForPrompt = hasVariants && selectedVariant
        ? offer.items.filter((item) => !item.variantName || item.variantName === selectedVariant)
        : offer.items;
    const itemsList = selectionSnapshot?.items && selectionSnapshot.items.length > 0
        ? selectionSnapshot.items.map((item) => {
            const variantPart = item.variantName ? `, wariant: ${item.variantName}` : '';
            const selectedPart = item.isSelected ? '' : ' [odznaczony]';
            return `- ${item.name}: ${item.unitPrice} PLN × ${item.quantity} (VAT ${item.vatRate}%, rabat ${item.discount}%)${variantPart}${selectedPart}`;
        }).join('\n')
        : itemsForPrompt.map(item => `- ${item.name}: ${item.unitPrice} PLN × ${item.quantity} ${item.unit} (VAT ${item.vatRate}%)${item.isOptional ? ' [opcjonalny]' : ''}${item.variantName ? ` [wariant: ${item.variantName}]` : ''}`).join('\n');
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
    const prompt = (0, prompts_1.buildPostMortemPrompt)({
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
        const responseText = await (0, core_1.callGemini)(ai, prompt);
        const parsed = (0, core_1.extractJson)(responseText);
        const baseObj = (0, core_1.isRecord)(parsed) ? parsed : fallbackInsight;
        const existingLessons = Array.isArray(baseObj.keyLessons)
            ? baseObj.keyLessons
                .map((v) => String(v))
                .map((s) => s.trim())
                .filter((s) => s.length > 0)
            : [];
        const shouldAddVariantTrendLesson = hasVariants &&
            variantHistory &&
            typeof variantHistory.topVariant === 'string' &&
            typeof variantHistory.topVariantShare === 'number' &&
            variantHistory.totalAcceptedWithVariant >= 3 &&
            variantHistory.topVariantShare >= 50;
        const variantTrendLesson = shouldAddVariantTrendLesson
            ? `Warianty: w zaakceptowanych ofertach najczęściej wybierany jest „${variantHistory.topVariant}" (${variantHistory.topVariantShare}%, n=${variantHistory.totalAcceptedWithVariant}).`
            : null;
        const keyLessons = variantTrendLesson
            ? [variantTrendLesson, ...existingLessons.filter((l) => l !== variantTrendLesson)]
            : existingLessons;
        const improvementSuggestions = Array.isArray(baseObj.improvementSuggestions)
            ? baseObj.improvementSuggestions
                .map((v) => String(v))
                .map((s) => s.trim())
                .filter((s) => s.length > 0)
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
        await prisma_1.default.offerLegacyInsight.create({
            data: {
                offerId,
                userId,
                outcome,
                insights: insightToSave,
            },
        });
        cache_1.aiCache.invalidatePattern(`price-insight:${userId}`);
        const { notificationService } = await Promise.resolve().then(() => __importStar(require('../notification.service')));
        notificationService.aiInsight(userId, {
            offerId,
            offerNumber: offer.number,
            outcome,
        }).catch((err) => {
            console.error('❌ AI Insight notification failed:', err);
        });
        console.log(`✅ Post-mortem saved for offer ${offer.number} [${outcome}]`);
    }
    catch (error) {
        console.error('❌ Post-mortem AI analysis failed, saving fallback:', error);
        await prisma_1.default.offerLegacyInsight.create({
            data: {
                offerId,
                userId,
                outcome,
                insights: fallbackInsight,
            },
        });
    }
}
async function getLatestInsights(userId, limit = 3) {
    const insights = await prisma_1.default.offerLegacyInsight.findMany({
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
        insights: insight.insights,
        createdAt: insight.createdAt.toISOString(),
    }));
}
async function getInsightsList(userId, params) {
    const { page, limit, outcome, dateFrom, dateTo, search } = params;
    const skip = (page - 1) * limit;
    const where = { userId };
    if (outcome) {
        where.outcome = outcome;
    }
    if (dateFrom || dateTo) {
        const createdAtFilter = {};
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
        prisma_1.default.offerLegacyInsight.findMany({
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
        prisma_1.default.offerLegacyInsight.count({ where }),
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
        insights: insight.insights,
        resolvedAt: insight.outcome === 'ACCEPTED'
            ? insight.offer.acceptedAt?.toISOString() || null
            : insight.offer.rejectedAt?.toISOString() || null,
        createdAt: insight.createdAt.toISOString(),
    }));
    return { data, total };
}
