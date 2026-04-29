// src/services/ai/feedback.service.ts
import { GoogleGenAI } from '@google/genai';
import { Prisma } from '@prisma/client';
import { aiCache } from '../../lib/cache';
import { createModuleLogger } from '../../lib/logger';
import { feedbackRepository } from '../../repositories/feedback.repository';
import { callGemini, extractJson, isRecord, parseClientSelectedSnapshot, inferSelectedVariantFromInteractions, VariantHistoryStats } from './core';
import { buildPostMortemPrompt } from './prompts';
import { buildVariantHistoryStats, buildItemsList, buildSelectionSummary, buildVariantBlock, buildKeyLessons } from './feedback.helpers';

const logger = createModuleLogger('feedback-service');

type PostMortemOffer = NonNullable<
    Awaited<ReturnType<typeof feedbackRepository.findOfferForPostMortem>>
>;

type FallbackInsight = {
    summary: string;
    keyLessons: string[];
    pricingInsight: string;
    improvementSuggestions: string[];
    industryNote: string;
    selectedVariant: string | null;
    availableVariants: string[];
    variantHistory: VariantHistoryStats | null;
};

export class FeedbackService {
    async generatePostMortem(
        ai: GoogleGenAI | null,
        userId: string,
        offerId: string,
        outcome: 'ACCEPTED' | 'REJECTED',
    ): Promise<void> {
        const existing = await feedbackRepository.findExisting(offerId, userId);
        if (existing) {
            logger.info({ offerId }, 'Post-mortem already exists, skipping');
            return;
        }

        const offer = await feedbackRepository.findOfferForPostMortem(offerId, userId);
        if (!offer) {
            logger.error({ offerId, userId }, 'Post-mortem: offer not found');
            return;
        }

        const availableVariants = [
            ...new Set(
                offer.items
                    .map((i) => i.variantName)
                    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0),
            ),
        ];

        const hasVariants = availableVariants.length > 0;
        const snapshot = parseClientSelectedSnapshot(offer.clientSelectedData);
        const inferredVariant = inferSelectedVariantFromInteractions(offer.interactions);
        const selectedVariant = snapshot?.selectedVariant ?? inferredVariant ?? null;
        const variantHistory = hasVariants
            ? buildVariantHistoryStats(
                await feedbackRepository.findAcceptedOffersForVariantStats(userId),
            )
            : null;

        const fallbackInsight: FallbackInsight = {
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
            await feedbackRepository.createInsight({
                offerId,
                userId,
                outcome,
                insights: fallbackInsight as unknown as Prisma.InputJsonValue,
            });
            return;
        }

        await this.generateWithAI(
            ai, userId, offerId, outcome, offer,
            availableVariants, hasVariants, selectedVariant, variantHistory, fallbackInsight,
        );
    }

    private async generateWithAI(
        ai: GoogleGenAI,
        userId: string,
        offerId: string,
        outcome: 'ACCEPTED' | 'REJECTED',
        offer: PostMortemOffer,
        availableVariants: string[],
        hasVariants: boolean,
        selectedVariant: string | null,
        variantHistory: VariantHistoryStats | null,
        fallbackInsight: FallbackInsight,
    ): Promise<void> {
        const interactionTimeline = offer.interactions.map((i) => ({
            type: i.type,
            createdAt: i.createdAt.toISOString(),
        }));

        const prompt = buildPostMortemPrompt({
            offerNumber: offer.number,
            offerTitle: offer.title,
            outcome,
            clientName: offer.client.name,
            clientCompany: offer.client.company,
            clientType: offer.client.type,
            totalGross: String(offer.totalGross),
            variantBlock: buildVariantBlock(availableVariants, selectedVariant, variantHistory),
            selectionSummary: buildSelectionSummary(offer),
            itemsList: buildItemsList(offer, selectedVariant),
            viewCount: offer.views.length,
            interactionTimeline: interactionTimeline
                .slice(0, 20)
                .map((i) => `${i.type} @ ${i.createdAt}`)
                .join('\n'),
            interactionCount: interactionTimeline.length,
            commentsText: offer.comments.map((c) => `[${c.author}] ${c.content}`).join('\n')
                || 'Brak komentarzy',
        });

        try {
            const responseText = await callGemini(ai, prompt);
            const parsed: unknown = extractJson(responseText);
            const baseObj: Record<string, unknown> = isRecord(parsed) ? parsed : fallbackInsight;

            const insightToSave = {
                ...baseObj,
                summary: typeof baseObj.summary === 'string' ? baseObj.summary : fallbackInsight.summary,
                pricingInsight: typeof baseObj.pricingInsight === 'string'
                    ? baseObj.pricingInsight
                    : fallbackInsight.pricingInsight,
                improvementSuggestions: Array.isArray(baseObj.improvementSuggestions)
                    ? baseObj.improvementSuggestions.map((v: unknown) => String(v).trim()).filter((s) => s.length > 0)
                    : fallbackInsight.improvementSuggestions,
                industryNote: typeof baseObj.industryNote === 'string'
                    ? baseObj.industryNote
                    : fallbackInsight.industryNote,
                keyLessons: buildKeyLessons(baseObj, variantHistory, hasVariants),
                selectedVariant,
                availableVariants,
                variantHistory,
            };

            await feedbackRepository.createInsight({
                offerId,
                userId,
                outcome,
                insights: insightToSave as unknown as Prisma.InputJsonValue,
            });

            aiCache.invalidatePattern(`price-insight:${userId}`);

            const { notificationService } = await import('../notification.service');
            notificationService.aiInsight(userId, {
                offerId,
                offerNumber: offer.number,
                outcome,
            }).catch((err: unknown) => {
                logger.error({ err, offerId }, 'AI insight notification failed');
            });

            logger.info({ offerId, offerNumber: offer.number, outcome }, 'Post-mortem saved');
        } catch (err: unknown) {
            logger.error({ err, offerId }, 'Post-mortem AI analysis failed, saving fallback');

            await feedbackRepository.createInsight({
                offerId,
                userId,
                outcome,
                insights: fallbackInsight as unknown as Prisma.InputJsonValue,
            });
        }
    }

    async getLatestInsights(userId: string, limit: number = 3) {
        const insights = await feedbackRepository.findLatest(userId, limit);

        return insights.map((insight) => ({
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

    async getInsightsList(
        userId: string,
        params: {
            page: number;
            limit: number;
            outcome?: 'ACCEPTED' | 'REJECTED';
            dateFrom?: string;
            dateTo?: string;
            search?: string;
        },
    ): Promise<{ data: Array<Record<string, unknown>>; total: number }> {
        const { insights, total } = await feedbackRepository.findList({
            userId,
            page: params.page,
            limit: params.limit,
            outcome: params.outcome,
            dateFrom: params.dateFrom,
            dateTo: params.dateTo,
            search: params.search,
        });

        const data = insights.map((insight) => ({
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
}

export const feedbackService = new FeedbackService();