// src/services/ai/price-insight.service.ts
import { GoogleGenAI } from '@google/genai';
import { Decimal } from '@prisma/client/runtime/library';
import { AIRepository } from '../../repositories/ai.repository';
import { MemoryCache, buildCacheKey, CACHE_TTL } from '../../lib/cache';
import { Logger } from 'pino';
import { callGemini, extractJson, offerStatusLabels } from './core';
import { buildPriceInsightPrompt } from './prompts';
import { parseConfidence, computeAvgPrice } from './parsers';
import {
    PriceInsightResult,
    PriceInsightAISuggestion,
    PriceInsightHistoricalItem,
} from './ai-types';

export class PriceInsightService {
    constructor(
        private ai: GoogleGenAI | null,
        private repository: AIRepository,
        private cache: MemoryCache,
        private logger: Logger,
    ) {}

    async analyze(userId: string, itemName: string, category?: string): Promise<PriceInsightResult> {
        const cacheKey = buildCacheKey('price-insight', userId, itemName.toLowerCase().trim(), category ?? '');
        const cached = this.cache.get<PriceInsightResult>(cacheKey);

        if (cached) {
            this.logger.debug({ userId, itemName, cached: true }, 'Price insight cache hit');
            return cached;
        }

        this.logger.info({ userId, itemName, category }, 'Analyzing price insight');

        const historicalItems = await this.repository.findHistoricalOfferItems(userId, itemName, 20);
        const prices = historicalItems.map((item) => Number(item.unitPrice));
        const avgPrice = computeAvgPrice(prices);
        const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
        const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

        const formattedItems = this.formatHistoricalItems(historicalItems);
        const fallbackSuggestion = this.buildFallbackSuggestion(minPrice, maxPrice);

        if (!this.ai) {
            this.logger.warn({ userId }, 'AI not configured, returning historical data only');
            return this.buildResult(avgPrice, minPrice, maxPrice, historicalItems.length, formattedItems, fallbackSuggestion);
        }

        const legacyInsights = await this.repository.findLegacyInsights(userId, 5);
        const prompt = this.buildPrompt(itemName, category, formattedItems, historicalItems.length, avgPrice, minPrice, maxPrice, legacyInsights);

        try {
            const responseText = await callGemini(this.ai, prompt);
            const parsed = extractJson(responseText) as Record<string, unknown> | null;
            const aiSuggestion = parsed ? this.parseAISuggestion(parsed, minPrice, maxPrice) : fallbackSuggestion;

            const result = this.buildResult(avgPrice, minPrice, maxPrice, historicalItems.length, formattedItems, aiSuggestion);
            this.cache.set(cacheKey, result, CACHE_TTL.PRICE_INSIGHT);

            this.logger.info({ userId, itemName, confidence: aiSuggestion.confidence }, 'Price insight analyzed successfully');
            return result;
        } catch (err) {
            this.logger.error({ err, userId, itemName }, 'Failed to analyze price insight with AI');
            return this.buildResult(avgPrice, minPrice, maxPrice, historicalItems.length, formattedItems, {
                ...fallbackSuggestion,
                marketAnalysis: 'Wystąpił błąd AI. Wyświetlono tylko dane historyczne.',
            });
        }
    }

    private formatHistoricalItems(items: Awaited<ReturnType<typeof this.repository.findHistoricalOfferItems>>): PriceInsightHistoricalItem[] {
        return items.map((item) => ({
            name: item.name,
            unitPrice: Number(item.unitPrice),
            quantity: Number(item.quantity),
            unit: item.unit,
            offerTitle: item.offer.title,
            offerStatus: item.offer.status,
            clientName: item.offer.client?.name ?? 'Nieznany',
            date: item.offer.createdAt.toISOString(),
        }));
    }

    private buildFallbackSuggestion(minPrice: number, maxPrice: number): PriceInsightAISuggestion {
        return {
            suggestedMin: minPrice,
            suggestedMax: maxPrice,
            marketAnalysis: this.ai
                ? 'Nie udało się wygenerować analizy AI.'
                : 'AI nie jest skonfigurowany. Wyświetlono tylko dane historyczne.',
            marginWarning: null,
            confidence: 'low',
        };
    }

    private buildPrompt(
        itemName: string,
        category: string | undefined,
        formattedItems: PriceInsightHistoricalItem[],
        count: number,
        avgPrice: number,
        minPrice: number,
        maxPrice: number,
        legacyInsights: Awaited<ReturnType<typeof this.repository.findLegacyInsights>>,
    ): string {
        const historicalSummary =
            count > 0
                ? `Znaleziono ${count} rekordów.\nŚrednia: ${avgPrice} PLN, Min: ${minPrice} PLN, Max: ${maxPrice} PLN\nSzczegóły:\n${formattedItems
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

        return buildPriceInsightPrompt(itemName, category, historicalSummary, legacySummary);
    }

    private parseAISuggestion(parsed: Record<string, unknown>, minPrice: number, maxPrice: number): PriceInsightAISuggestion {
        return {
            suggestedMin: Number(parsed.suggestedMin) || minPrice,
            suggestedMax: Number(parsed.suggestedMax) || maxPrice,
            marketAnalysis: String(parsed.marketAnalysis ?? ''),
            marginWarning: parsed.marginWarning ? String(parsed.marginWarning) : null,
            confidence: parseConfidence(parsed.confidence),
        };
    }

    private buildResult(
        avgPrice: number,
        minPrice: number,
        maxPrice: number,
        count: number,
        items: PriceInsightHistoricalItem[],
        aiSuggestion: PriceInsightAISuggestion,
    ): PriceInsightResult {
        return {
            historicalData: { avgPrice, minPrice, maxPrice, count, items },
            aiSuggestion,
        };
    }
}