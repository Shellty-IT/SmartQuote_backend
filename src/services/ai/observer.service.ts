// src/services/ai/observer.service.ts
import { GoogleGenAI } from '@google/genai';
import { AIRepository } from '../../repositories/ai.repository';
import { MemoryCache, buildCacheKey, CACHE_TTL } from '../../lib/cache';
import { Logger } from 'pino';
import { callGemini, extractJson, offerStatusLabels } from './core';
import { buildObserverPrompt, ObserverPromptData } from './prompts';
import { parseClientIntent, parseStringArray, parseNumber } from './parsers';
import { ObserverResult, TimeAnalysis } from './ai-types';

export class ObserverService {
    constructor(
        private ai: GoogleGenAI | null,
        private repository: AIRepository,
        private cache: MemoryCache,
        private logger: Logger,
    ) {}

    async analyze(userId: string, offerId: string): Promise<ObserverResult> {
        const cacheKey = buildCacheKey('observer', userId, offerId);
        const cached = this.cache.get<ObserverResult>(cacheKey);

        if (cached) {
            this.logger.debug({ userId, offerId, cached: true }, 'Observer cache hit');
            return cached;
        }

        this.logger.info({ userId, offerId }, 'Analyzing observer insight');

        const offer = await this.repository.findOfferForObserver(offerId, userId);
        if (!offer) {
            this.logger.error({ userId, offerId }, 'Offer not found for observer');
            throw new Error('Oferta nie znaleziona');
        }

        const { views, interactions, comments } = offer;
        const timeAnalysis = this.buildTimeAnalysis(views, interactions);

        if (views.length === 0 && interactions.length === 0) {
            this.logger.debug({ userId, offerId }, 'No activity on offer');
            return this.buildNoActivityResult(timeAnalysis);
        }

        const clientComments = comments.filter((c) => c.author === 'CLIENT');

        if (!this.ai) {
            this.logger.warn({ userId, offerId }, 'AI not configured, returning basic observer data');
            return this.buildBasicResult(views.length, interactions.length, clientComments.length, timeAnalysis);
        }

        const promptData = this.buildPromptData(offer, views, interactions, clientComments);
        const prompt = buildObserverPrompt(promptData);

        try {
            const responseText = await callGemini(this.ai, prompt);
            const parsed = extractJson(responseText) as Record<string, unknown> | null;

            if (!parsed) {
                this.logger.error({ userId, offerId }, 'Failed to parse Observer AI response');
                throw new Error('Failed to parse Observer response');
            }

            const result = this.parseObserverResult(parsed, timeAnalysis);
            this.cache.set(cacheKey, result, CACHE_TTL.OBSERVER);

            this.logger.info(
                { userId, offerId, clientIntent: result.clientIntent, score: result.engagementScore },
                'Observer analyzed successfully',
            );
            return result;
        } catch (err) {
            this.logger.error({ err, userId, offerId }, 'Failed to analyze observer with AI');
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

    private buildTimeAnalysis(
        views: Array<{ viewedAt: Date; duration: number | null }>,
        interactions: Array<{ createdAt: Date }>,
    ): TimeAnalysis {
        const durationsWithValue = views
            .filter((v) => v.duration !== null)
            .map((v) => v.duration!);

        const avgViewDuration =
            durationsWithValue.length > 0
                ? Math.round(
                    durationsWithValue.reduce((a, b) => a + b, 0) / durationsWithValue.length,
                )
                : null;

        let mostActiveTime: string | null = null;
        const allTimestamps = [
            ...views.map((v) => v.viewedAt),
            ...interactions.map((i) => i.createdAt),
        ];

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

    private buildNoActivityResult(timeAnalysis: TimeAnalysis): ObserverResult {
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

    private buildBasicResult(
        viewCount: number,
        interactionCount: number,
        commentCount: number,
        timeAnalysis: TimeAnalysis,
    ): ObserverResult {
        return {
            summary: `Klient wyświetlił ofertę ${viewCount} razy.`,
            keyFindings: [
                `Liczba wyświetleń: ${viewCount}`,
                `Liczba interakcji: ${interactionCount}`,
                commentCount > 0
                    ? `Klient zostawił ${commentCount} komentarzy`
                    : 'Brak komentarzy klienta',
            ],
            clientIntent: 'unknown',
            interestAreas: [],
            concerns: [],
            engagementScore: Math.min(10, Math.round((viewCount + interactionCount) / 3)),
            timeAnalysis,
        };
    }

    private buildPromptData(
        offer: NonNullable<Awaited<ReturnType<typeof this.repository.findOfferForObserver>>>,
        views: typeof offer.views,
        interactions: typeof offer.interactions,
        clientComments: typeof offer.comments,
    ): ObserverPromptData {
        return {
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
                        const details = i.details ? ` - ${JSON.stringify(i.details)}` : '';
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
    }

    private parseObserverResult(
        parsed: Record<string, unknown>,
        timeAnalysis: TimeAnalysis,
    ): ObserverResult {
        return {
            summary: String(parsed.summary ?? ''),
            keyFindings: parseStringArray(parsed.keyFindings),
            clientIntent: parseClientIntent(parsed.clientIntent),
            interestAreas: parseStringArray(parsed.interestAreas),
            concerns: parseStringArray(parsed.concerns),
            engagementScore: Math.min(10, Math.max(0, parseNumber(parsed.engagementScore, 0))),
            timeAnalysis,
        };
    }
}