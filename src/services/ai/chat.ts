// smartquote_backend/src/services/ai/chat.ts
import { GoogleGenAI } from '@google/genai';
import prisma from '../../lib/prisma';
import { aiCache, CACHE_TTL, buildCacheKey } from '../../lib/cache';
import {
    AIMessage,
    AIContext,
    AIResponse,
    AIAction,
    AIStats,
    GeneratedOffer,
    ClientAnalysis,
    EmailGenerationContext,
    EmailType,
} from '../../types';
import { callGemini, extractJson, safeJsonParse, initAI } from './core';
import {
    buildSystemPrompt,
    buildChatPrompt,
    buildOfferGenerationPrompt,
    buildEmailPrompt,
    buildClientAnalysisPrompt,
} from './prompts';

export async function getUserContext(userId: string): Promise<AIContext> {
    const [clients, offers, contracts, followUps] = await Promise.all([
        prisma.client.findMany({
            where: { userId },
            take: 50,
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                name: true,
                company: true,
                email: true,
                type: true,
                isActive: true,
            },
        }),
        prisma.offer.findMany({
            where: { userId },
            take: 30,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                number: true,
                title: true,
                status: true,
                totalGross: true,
                validUntil: true,
                client: { select: { name: true, company: true } },
            },
        }),
        prisma.contract.findMany({
            where: { userId },
            take: 20,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                number: true,
                title: true,
                status: true,
                totalGross: true,
                client: { select: { name: true, company: true } },
            },
        }),
        prisma.followUp.findMany({
            where: { userId },
            take: 30,
            orderBy: { dueDate: 'asc' },
            select: {
                id: true,
                title: true,
                type: true,
                status: true,
                priority: true,
                dueDate: true,
                client: { select: { name: true } },
            },
        }),
    ]);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalClients, activeOffers, pendingFollowUps, revenueResult] = await Promise.all([
        prisma.client.count({ where: { userId } }),
        prisma.offer.count({
            where: { userId, status: { in: ['DRAFT', 'SENT', 'NEGOTIATION'] } },
        }),
        prisma.followUp.count({
            where: { userId, status: 'PENDING', dueDate: { lte: new Date() } },
        }),
        prisma.offer.aggregate({
            where: {
                userId,
                status: 'ACCEPTED',
                updatedAt: { gte: startOfMonth },
            },
            _sum: { totalGross: true },
        }),
    ]);

    const stats: AIStats = {
        totalClients,
        activeOffers,
        pendingFollowUps,
        monthlyRevenue: revenueResult._sum.totalGross?.toNumber() || 0,
    };

    return { userId, clients, offers, contracts, followUps, stats };
}

function parseActions(response: string): { cleanMessage: string; actions: AIAction[] } {
    const actions: AIAction[] = [];
    let cleanMessage = response;

    const actionRegex = /\[AKCJA:([\w_]+)(?::([^\]]+))?\]/g;
    let match;

    while ((match = actionRegex.exec(response)) !== null) {
        const [fullMatch, type, payload] = match;

        switch (type) {
            case 'create_offer':
                actions.push({
                    type: 'create_offer',
                    label: '➕ Utwórz ofertę',
                    payload: payload ? safeJsonParse(payload) : {},
                });
                break;
            case 'create_followup':
                actions.push({
                    type: 'create_followup',
                    label: '📅 Zaplanuj follow-up',
                    payload: payload ? safeJsonParse(payload) : {},
                });
                break;
            case 'send_email':
                actions.push({
                    type: 'send_email',
                    label: '✉️ Wyślij email',
                    payload: payload ? safeJsonParse(payload) : {},
                });
                break;
        }

        cleanMessage = cleanMessage.replace(fullMatch, '');
    }

    return { cleanMessage: cleanMessage.trim(), actions };
}

function generateSuggestions(message: string, context: AIContext): string[] {
    const suggestions: string[] = [];
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('ofert')) {
        suggestions.push('Pokaż moje ostatnie oferty');
        suggestions.push('Jak poprawić konwersję ofert?');
    }

    if (lowerMessage.includes('klient')) {
        suggestions.push('Którzy klienci są najbardziej aktywni?');
        suggestions.push('Zasugeruj follow-up dla klienta');
    }

    if (context.stats?.pendingFollowUps && context.stats.pendingFollowUps > 0) {
        suggestions.push(`Mam ${context.stats.pendingFollowUps} zaległych follow-upów. Co powinienem zrobić?`);
    }

    if (suggestions.length === 0) {
        suggestions.push('Pomóż mi stworzyć ofertę');
        suggestions.push('Pokaż statystyki sprzedaży');
        suggestions.push('Jakie mam zaległe zadania?');
    }

    return suggestions.slice(0, 3);
}

export async function chat(
    ai: GoogleGenAI | null,
    userId: string,
    message: string,
    conversationHistory: AIMessage[] = []
): Promise<AIResponse> {
    if (!ai) {
        return {
            message: '⚠️ AI Asystent nie jest skonfigurowany. Dodaj GEMINI_API_KEY do zmiennych środowiskowych.',
            suggestions: ['Skontaktuj się z administratorem'],
        };
    }

    try {
        const context = await getUserContext(userId);
        const systemPrompt = buildSystemPrompt(context);
        const fullPrompt = buildChatPrompt(systemPrompt, conversationHistory, message);

        const responseText = await callGemini(ai, fullPrompt);
        const { cleanMessage, actions } = parseActions(responseText);
        const suggestions = generateSuggestions(message, context);

        return { message: cleanMessage, suggestions, actions };
    } catch (error: unknown) {
        console.error('❌ AI Service Error:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (errorMessage.includes('API_KEY') || errorMessage.includes('API key')) {
            return {
                message: '❌ Nieprawidłowy klucz API. Sprawdź konfigurację GEMINI_API_KEY.',
                suggestions: [],
            };
        }

        if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
            return {
                message: '❌ Przekroczono limit zapytań do AI. Spróbuj ponownie później.',
                suggestions: [],
            };
        }

        if (errorMessage.includes('not found') || errorMessage.includes('404')) {
            return {
                message: '❌ Model AI nie został znaleziony. Sprawdź konfigurację GEMINI_MODEL.',
                suggestions: [],
            };
        }

        return {
            message: '❌ Wystąpił błąd podczas komunikacji z AI. Spróbuj ponownie.',
            suggestions: ['Spróbuj ponownie', 'Zadaj inne pytanie'],
        };
    }
}

export async function generateOffer(
    ai: GoogleGenAI | null,
    description: string
): Promise<GeneratedOffer> {
    if (!ai) throw new Error('AI nie jest skonfigurowany');

    try {
        const prompt = buildOfferGenerationPrompt(description);
        const responseText = await callGemini(ai, prompt);
        const parsed = extractJson(responseText);
        if (parsed) return parsed as GeneratedOffer;
        throw new Error('Nie udało się wygenerować oferty');
    } catch (error: unknown) {
        console.error('Generate offer error:', error);
        throw error;
    }
}

export async function generateEmail(
    ai: GoogleGenAI | null,
    type: EmailType,
    context: EmailGenerationContext
): Promise<string> {
    if (!ai) throw new Error('AI nie jest skonfigurowany');

    const prompt = buildEmailPrompt(type, context);
    return callGemini(ai, prompt);
}

export async function analyzeClient(
    ai: GoogleGenAI | null,
    userId: string,
    clientId: string
): Promise<ClientAnalysis> {
    if (!ai) throw new Error('AI nie jest skonfigurowany');

    const cacheKey = buildCacheKey('client-analysis', userId, clientId);
    const cached = aiCache.get<ClientAnalysis>(cacheKey);
    if (cached) return cached;

    const client = await prisma.client.findFirst({
        where: { id: clientId, userId },
        include: {
            offers: { orderBy: { createdAt: 'desc' }, take: 10 },
            contracts: { orderBy: { createdAt: 'desc' }, take: 5 },
            followUps: { orderBy: { dueDate: 'desc' }, take: 10 },
        },
    });

    if (!client) throw new Error('Klient nie znaleziony');

    const prompt = buildClientAnalysisPrompt({
        name: client.name,
        company: client.company,
        type: client.type,
        email: client.email,
        isActive: client.isActive,
        offers: client.offers.map(o => ({
            title: o.title,
            status: o.status,
            totalGross: o.totalGross,
        })),
        contracts: client.contracts.map(c => ({
            title: c.title,
            status: c.status,
        })),
        followUps: client.followUps.map(f => ({
            title: f.title,
            status: f.status,
            type: f.type,
        })),
    });

    const responseText = await callGemini(ai, prompt);
    const parsed = extractJson(responseText);

    let result: ClientAnalysis;
    if (parsed) {
        result = parsed as ClientAnalysis;
    } else {
        result = {
            score: 5,
            potential: 'sredni',
            summary: responseText,
            recommendations: [],
            nextAction: 'Skontaktuj się z klientem',
            risks: [],
        };
    }

    aiCache.set(cacheKey, result, CACHE_TTL.CLIENT_ANALYSIS);
    return result;
}