"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserContext = getUserContext;
exports.chat = chat;
exports.generateOffer = generateOffer;
exports.generateEmail = generateEmail;
exports.analyzeClient = analyzeClient;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const cache_1 = require("../../lib/cache");
const core_1 = require("./core");
const prompts_1 = require("./prompts");
async function getUserContext(userId) {
    const [clients, offers, contracts, followUps] = await Promise.all([
        prisma_1.default.client.findMany({
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
        prisma_1.default.offer.findMany({
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
        prisma_1.default.contract.findMany({
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
        prisma_1.default.followUp.findMany({
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
        prisma_1.default.client.count({ where: { userId } }),
        prisma_1.default.offer.count({
            where: { userId, status: { in: ['DRAFT', 'SENT', 'NEGOTIATION'] } },
        }),
        prisma_1.default.followUp.count({
            where: { userId, status: 'PENDING', dueDate: { lte: new Date() } },
        }),
        prisma_1.default.offer.aggregate({
            where: {
                userId,
                status: 'ACCEPTED',
                updatedAt: { gte: startOfMonth },
            },
            _sum: { totalGross: true },
        }),
    ]);
    const stats = {
        totalClients,
        activeOffers,
        pendingFollowUps,
        monthlyRevenue: revenueResult._sum.totalGross?.toNumber() || 0,
    };
    return { userId, clients, offers, contracts, followUps, stats };
}
function parseActions(response) {
    const actions = [];
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
                    payload: payload ? (0, core_1.safeJsonParse)(payload) : {},
                });
                break;
            case 'create_followup':
                actions.push({
                    type: 'create_followup',
                    label: '📅 Zaplanuj follow-up',
                    payload: payload ? (0, core_1.safeJsonParse)(payload) : {},
                });
                break;
            case 'send_email':
                actions.push({
                    type: 'send_email',
                    label: '✉️ Wyślij email',
                    payload: payload ? (0, core_1.safeJsonParse)(payload) : {},
                });
                break;
        }
        cleanMessage = cleanMessage.replace(fullMatch, '');
    }
    return { cleanMessage: cleanMessage.trim(), actions };
}
function generateSuggestions(message, context) {
    const suggestions = [];
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
async function chat(ai, userId, message, conversationHistory = []) {
    if (!ai) {
        return {
            message: '⚠️ AI Asystent nie jest skonfigurowany. Dodaj GEMINI_API_KEY do zmiennych środowiskowych.',
            suggestions: ['Skontaktuj się z administratorem'],
        };
    }
    try {
        const context = await getUserContext(userId);
        const systemPrompt = (0, prompts_1.buildSystemPrompt)(context);
        const fullPrompt = (0, prompts_1.buildChatPrompt)(systemPrompt, conversationHistory, message);
        const responseText = await (0, core_1.callGemini)(ai, fullPrompt);
        const { cleanMessage, actions } = parseActions(responseText);
        const suggestions = generateSuggestions(message, context);
        return { message: cleanMessage, suggestions, actions };
    }
    catch (error) {
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
async function generateOffer(ai, description) {
    if (!ai)
        throw new Error('AI nie jest skonfigurowany');
    try {
        const prompt = (0, prompts_1.buildOfferGenerationPrompt)(description);
        const responseText = await (0, core_1.callGemini)(ai, prompt);
        const parsed = (0, core_1.extractJson)(responseText);
        if (parsed)
            return parsed;
        throw new Error('Nie udało się wygenerować oferty');
    }
    catch (error) {
        console.error('Generate offer error:', error);
        throw error;
    }
}
async function generateEmail(ai, type, context) {
    if (!ai)
        throw new Error('AI nie jest skonfigurowany');
    const prompt = (0, prompts_1.buildEmailPrompt)(type, context);
    return (0, core_1.callGemini)(ai, prompt);
}
async function analyzeClient(ai, userId, clientId) {
    if (!ai)
        throw new Error('AI nie jest skonfigurowany');
    const cacheKey = (0, cache_1.buildCacheKey)('client-analysis', userId, clientId);
    const cached = cache_1.aiCache.get(cacheKey);
    if (cached)
        return cached;
    const client = await prisma_1.default.client.findFirst({
        where: { id: clientId, userId },
        include: {
            offers: { orderBy: { createdAt: 'desc' }, take: 10 },
            contracts: { orderBy: { createdAt: 'desc' }, take: 5 },
            followUps: { orderBy: { dueDate: 'desc' }, take: 10 },
        },
    });
    if (!client)
        throw new Error('Klient nie znaleziony');
    const prompt = (0, prompts_1.buildClientAnalysisPrompt)({
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
    const responseText = await (0, core_1.callGemini)(ai, prompt);
    const parsed = (0, core_1.extractJson)(responseText);
    let result;
    if (parsed) {
        result = parsed;
    }
    else {
        result = {
            score: 5,
            potential: 'sredni',
            summary: responseText,
            recommendations: [],
            nextAction: 'Skontaktuj się z klientem',
            risks: [],
        };
    }
    cache_1.aiCache.set(cacheKey, result, cache_1.CACHE_TTL.CLIENT_ANALYSIS);
    return result;
}
