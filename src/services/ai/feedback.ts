// src/services/ai/feedback.ts
import { GoogleGenAI } from '@google/genai';
import { feedbackService } from './feedback.service';

export async function generatePostMortem(
    ai: GoogleGenAI | null,
    userId: string,
    offerId: string,
    outcome: 'ACCEPTED' | 'REJECTED',
): Promise<void> {
    return feedbackService.generatePostMortem(ai, userId, offerId, outcome);
}

export async function getLatestInsights(userId: string, limit: number = 3) {
    return feedbackService.getLatestInsights(userId, limit);
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
    },
): Promise<{ data: Array<Record<string, unknown>>; total: number }> {
    return feedbackService.getInsightsList(userId, params);
}