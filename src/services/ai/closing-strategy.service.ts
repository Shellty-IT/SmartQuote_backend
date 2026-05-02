// src/services/ai/closing-strategy.service.ts
import { GoogleGenAI } from '@google/genai';
import { AIRepository } from '../../repositories/ai.repository';
import { MemoryCache, buildCacheKey, CACHE_TTL } from '../../lib/cache';
import { Logger } from 'pino';
import { callGemini, extractJson } from './core';
import { buildClosingStrategyPrompt, ClosingStrategyPromptData } from './prompts';
import { parseRiskLevel, parseStringArray, parseNumber } from './parsers';
import { ClosingStrategyResult, ObserverContext } from './ai-types';
import { ObserverService } from './observer.service';

export class ClosingStrategyService {
    constructor(
        private ai: GoogleGenAI | null,
        private repository: AIRepository,
        private cache: MemoryCache,
        private logger: Logger,
        private observerService: ObserverService,
    ) {}

    async analyze(userId: string, offerId: string): Promise<ClosingStrategyResult> {
        const cacheKey = buildCacheKey('closing', userId, offerId);
        const cached = this.cache.get<ClosingStrategyResult>(cacheKey);

        if (cached) {
            this.logger.debug({ userId, offerId, cached: true }, 'Closing strategy cache hit');
            return cached;
        }

        this.logger.info({ userId, offerId }, 'Analyzing closing strategy');

        let observerContext: ObserverContext | null = null;

        try {
            const observer = await this.observerService.analyze(userId, offerId);
            observerContext = {
                summary: observer.summary,
                clientIntent: observer.clientIntent,
                concerns: observer.concerns,
                engagementScore: observer.engagementScore,
            };
        } catch (err) {
            this.logger.warn({ err, userId, offerId }, 'Failed to get observer context for closing strategy');
        }

        const offer = await this.repository.findOfferForClosing(offerId, userId);
        if (!offer) {
            this.logger.error({ userId, offerId }, 'Offer not found for closing strategy');
            throw new Error('Oferta nie znaleziona');
        }

        const fallback = this.buildFallbackStrategy(
            offer.title,
            offer.number,
            observerContext?.summary ?? 'Brak danych o zachowaniu klienta.',
        );

        if (!this.ai) {
            this.logger.warn({ userId, offerId }, 'AI not configured, returning fallback closing strategy');
            return fallback;
        }

        const clientComments = offer.comments.filter((c) => c.author === 'CLIENT');
        const sellerComments = offer.comments.filter((c) => c.author === 'SELLER');

        const promptData = this.buildPromptData(offer, observerContext, clientComments, sellerComments);
        const prompt = buildClosingStrategyPrompt(promptData);

        try {
            const responseText = await callGemini(this.ai, prompt);
            const parsed = extractJson(responseText) as Record<string, unknown> | null;

            if (!parsed) {
                this.logger.error({ userId, offerId }, 'Failed to parse Closer AI response');
                throw new Error('Failed to parse Closer response');
            }

            const result = this.parseClosingResult(parsed, observerContext?.summary ?? '');
            this.cache.set(cacheKey, result, CACHE_TTL.CLOSING_STRATEGY);

            this.logger.info({ userId, offerId }, 'Closing strategy analyzed successfully');
            return result;
        } catch (err) {
            this.logger.error({ err, userId, offerId }, 'Failed to analyze closing strategy with AI');
            return fallback;
        }
    }

    private buildFallbackStrategy(
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
                suggestedResponse: `W związku z naszą ofertą "${offerNumber}" - mogę zaproponować specjalne warunki przy decyzji do końca tygodnia. Czy jest to realne z Państwa strony?`,
                maxDiscountPercent: 5,
            },
            contextSummary,
        };
    }

    private buildPromptData(
        offer: NonNullable<Awaited<ReturnType<typeof this.repository.findOfferForClosing>>>,
        observerContext: ObserverContext | null,
        clientComments: typeof offer.comments,
        sellerComments: typeof offer.comments,
    ): ClosingStrategyPromptData {
        return {
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
    }

    private parseClosingResult(
        parsed: Record<string, unknown>,
        contextSummary: string,
    ): ClosingStrategyResult {
        const aggressive = parsed.aggressive as Record<string, unknown> | undefined;
        const partnership = parsed.partnership as Record<string, unknown> | undefined;
        const quickClose = parsed.quickClose as Record<string, unknown> | undefined;

        return {
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
                proposedConcessions: parseStringArray(partnership?.proposedConcessions),
            },
            quickClose: {
                title: String(quickClose?.title ?? 'Szybkie domknięcie'),
                description: String(quickClose?.description ?? ''),
                suggestedResponse: String(quickClose?.suggestedResponse ?? ''),
                maxDiscountPercent: Math.min(
                    15,
                    Math.max(0, parseNumber(quickClose?.maxDiscountPercent, 5)),
                ),
            },
            contextSummary: String(parsed.contextSummary ?? contextSummary),
        };
    }
}