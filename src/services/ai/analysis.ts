// src/services/ai/analysis.ts
import { GoogleGenAI } from '@google/genai';
import { config } from '../../config';
import { aiCache } from '../../lib/cache';
import { createModuleLogger } from '../../lib/logger';
import { aiRepository, AIRepository } from '../../repositories/ai.repository';
import { PriceInsightService } from './price-insight.service';
import { ObserverService } from './observer.service';
import { ClosingStrategyService } from './closing-strategy.service';
import { PriceInsightResult, ObserverResult, ClosingStrategyResult } from './ai-types';

const logger = createModuleLogger('ai:analysis');

let ai: GoogleGenAI | null = null;

if (config.gemini.apiKey) {
    ai = new GoogleGenAI({ apiKey: config.gemini.apiKey });
    logger.info('Google Gemini AI initialized');
} else {
    logger.warn('GEMINI_API_KEY not configured - AI features disabled');
}

const observerService = new ObserverService(ai, aiRepository, aiCache, createModuleLogger('ai:observer'));
const priceInsightService = new PriceInsightService(ai, aiRepository, aiCache, createModuleLogger('ai:price-insight'));
const closingStrategyService = new ClosingStrategyService(ai, aiRepository, aiCache, createModuleLogger('ai:closing'), observerService);

export async function getPriceInsight(
    _ai: GoogleGenAI | null,
    userId: string,
    itemName: string,
    category?: string,
): Promise<PriceInsightResult> {
    return priceInsightService.analyze(userId, itemName, category);
}

export async function getObserverInsight(
    _ai: GoogleGenAI | null,
    userId: string,
    offerId: string,
): Promise<ObserverResult> {
    return observerService.analyze(userId, offerId);
}

export async function getClosingStrategy(
    _ai: GoogleGenAI | null,
    userId: string,
    offerId: string,
): Promise<ClosingStrategyResult> {
    return closingStrategyService.analyze(userId, offerId);
}