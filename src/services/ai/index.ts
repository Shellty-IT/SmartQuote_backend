// smartquote_backend/src/services/ai/index.ts
import { GoogleGenAI } from '@google/genai';
import {
    AIMessage,
    AIResponse,
    GeneratedOffer,
    ClientAnalysis,
    EmailGenerationContext,
    EmailType,
} from '../../types';
import { initAI } from './core';
import { chat, generateOffer, generateEmail, analyzeClient, getUserContext } from './chat';
import { getPriceInsight, getObserverInsight, getClosingStrategy } from './analysis';
import { generatePostMortem, getLatestInsights, getInsightsList } from './feedback';

class AIService {
    private ai: GoogleGenAI | null;
    private conversationHistories: Map<string, Array<{ role: string; content: string }>> = new Map();

    constructor() {
        this.ai = initAI();
    }

    getUserContext(userId: string) {
        return getUserContext(userId);
    }

    chat(userId: string, message: string, conversationHistory: AIMessage[] = []): Promise<AIResponse> {
        return chat(this.ai, userId, message, conversationHistory);
    }

    generateOffer(_userId: string, description: string): Promise<GeneratedOffer> {
        return generateOffer(this.ai, description);
    }

    generateEmail(_userId: string, type: EmailType, context: EmailGenerationContext): Promise<string> {
        return generateEmail(this.ai, type, context);
    }

    analyzeClient(userId: string, clientId: string): Promise<ClientAnalysis> {
        return analyzeClient(this.ai, userId, clientId);
    }

    getPriceInsight(userId: string, itemName: string, category?: string) {
        return getPriceInsight(this.ai, userId, itemName, category);
    }

    getObserverInsight(userId: string, offerId: string) {
        return getObserverInsight(this.ai, userId, offerId);
    }

    getClosingStrategy(userId: string, offerId: string) {
        return getClosingStrategy(this.ai, userId, offerId);
    }

    generatePostMortem(userId: string, offerId: string, outcome: 'ACCEPTED' | 'REJECTED'): Promise<void> {
        return generatePostMortem(this.ai, userId, offerId, outcome);
    }

    getLatestInsights(userId: string, limit?: number) {
        return getLatestInsights(userId, limit);
    }

    getInsightsList(
        userId: string,
        params: {
            page: number;
            limit: number;
            outcome?: 'ACCEPTED' | 'REJECTED';
            dateFrom?: string;
            dateTo?: string;
            search?: string;
        }
    ) {
        return getInsightsList(userId, params);
    }

    clearConversationHistory(userId: string): void {
        this.conversationHistories.delete(userId);
    }
}

export const aiService = new AIService();