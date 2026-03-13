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
exports.aiService = void 0;
// smartquote_backend/src/services/ai.service.ts
const genai_1 = require("@google/genai");
const config_1 = require("../config");
const prisma_1 = __importDefault(require("../lib/prisma"));
const cache_1 = require("../lib/cache");
const priorityLabels = {
    URGENT: 'Pilny',
    HIGH: 'Wysoki',
    MEDIUM: 'Średni',
    LOW: 'Niski',
};
const followUpTypeLabels = {
    CALL: 'Telefon',
    EMAIL: 'Email',
    MEETING: 'Spotkanie',
    TASK: 'Zadanie',
    REMINDER: 'Przypomnienie',
    OTHER: 'Inne',
};
const offerStatusLabels = {
    DRAFT: 'Szkic',
    SENT: 'Wysłana',
    VIEWED: 'Przejrzana',
    NEGOTIATION: 'Negocjacje',
    ACCEPTED: 'Zaakceptowana',
    REJECTED: 'Odrzucona',
    EXPIRED: 'Wygasła',
};
class AIService {
    constructor() {
        this.ai = null;
        this.conversationHistories = new Map();
        if (config_1.config.gemini.apiKey) {
            this.ai = new genai_1.GoogleGenAI({ apiKey: config_1.config.gemini.apiKey });
            console.log('✅ AI Service initialized with model:', config_1.config.gemini.model);
        }
        else {
            console.warn('⚠️ GEMINI_API_KEY not configured. AI features will be disabled.');
        }
    }
    async getUserContext(userId) {
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
        const stats = {
            totalClients: await prisma_1.default.client.count({ where: { userId } }),
            activeOffers: await prisma_1.default.offer.count({
                where: { userId, status: { in: ['DRAFT', 'SENT', 'NEGOTIATION'] } },
            }),
            pendingFollowUps: await prisma_1.default.followUp.count({
                where: { userId, status: 'PENDING', dueDate: { lte: new Date() } },
            }),
            monthlyRevenue: await this.calculateMonthlyRevenue(userId),
        };
        return { userId, clients, offers, contracts, followUps, stats };
    }
    async calculateMonthlyRevenue(userId) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const result = await prisma_1.default.offer.aggregate({
            where: {
                userId,
                status: 'ACCEPTED',
                updatedAt: { gte: startOfMonth },
            },
            _sum: { totalGross: true },
        });
        return result._sum.totalGross?.toNumber() || 0;
    }
    buildSystemPrompt(context) {
        return `Jesteś SmartQuote AI - inteligentnym asystentem do zarządzania ofertami, umowami i relacjami z klientami.

TWOJE MOŻLIWOŚCI:
1. Pomagasz tworzyć profesjonalne oferty handlowe
2. Analizujesz klientów i sugerujesz działania follow-up
3. Generujesz treści: emaile, opisy produktów, notatki
4. Odpowiadasz na pytania o dane w systemie
5. Sugerujesz optymalizacje i najlepsze praktyki sprzedażowe

KONTEKST UŻYTKOWNIKA:
- Liczba klientów: ${context.stats?.totalClients || 0}
- Aktywne oferty: ${context.stats?.activeOffers || 0}
- Zaległe follow-upy: ${context.stats?.pendingFollowUps || 0}
- Przychód w tym miesiącu: ${context.stats?.monthlyRevenue?.toLocaleString('pl-PL')} PLN

OSTATNI KLIENCI (do 10):
${context.clients?.slice(0, 10).map(c => `- ${c.name}${c.company ? ` (${c.company})` : ''} - ${c.type === 'PERSON' ? 'Osoba' : 'Firma'}`).join('\n') || 'Brak klientów'}

OSTATNIE OFERTY (do 5):
${context.offers?.slice(0, 5).map(o => `- ${o.number}: ${o.title} - ${offerStatusLabels[o.status] || o.status} - ${o.totalGross} PLN dla ${o.client?.name || o.client?.company}`).join('\n') || 'Brak ofert'}

ZALEGŁE FOLLOW-UPY:
${context.followUps?.filter(f => f.status === 'PENDING').slice(0, 5).map(f => `- ${f.title} (${followUpTypeLabels[f.type] || f.type}) - priorytet: ${priorityLabels[f.priority] || f.priority} - termin: ${new Date(f.dueDate).toLocaleDateString('pl-PL')}`).join('\n') || 'Brak zaległych follow-upów'}

ZASADY:
- Odpowiadaj zawsze po polsku
- Bądź konkretny i profesjonalny
- Formatuj odpowiedzi używając Markdown
- Jeśli nie masz wystarczających informacji, dopytaj
- Sugeruj konkretne kwoty w PLN gdy to możliwe
- Pamiętaj o stawkach VAT (23%, 8%, 5%, 0%)
- Używaj polskich nazw dla statusów i priorytetów`;
    }
    async chat(userId, message, conversationHistory = []) {
        if (!this.ai) {
            return {
                message: '⚠️ AI Asystent nie jest skonfigurowany. Dodaj GEMINI_API_KEY do zmiennych środowiskowych.',
                suggestions: ['Skontaktuj się z administratorem'],
            };
        }
        try {
            const context = await this.getUserContext(userId);
            const systemPrompt = this.buildSystemPrompt(context);
            let fullPrompt = systemPrompt + '\n\n';
            if (conversationHistory.length > 0) {
                fullPrompt += 'POPRZEDNIA ROZMOWA:\n';
                conversationHistory.forEach(msg => {
                    const role = msg.role === 'user' ? 'Użytkownik' : 'Asystent';
                    fullPrompt += `${role}: ${msg.content}\n`;
                });
                fullPrompt += '\n';
            }
            fullPrompt += `Użytkownik: ${message}\n\nAsystent:`;
            const response = await this.ai.models.generateContent({
                model: config_1.config.gemini.model,
                contents: fullPrompt,
            });
            const responseText = response.text || '';
            const { cleanMessage, actions } = this.parseActions(responseText);
            const suggestions = this.generateSuggestions(message, context);
            return {
                message: cleanMessage,
                suggestions,
                actions,
            };
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
    parseActions(response) {
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
                        payload: payload ? this.safeJsonParse(payload) : {},
                    });
                    break;
                case 'create_followup':
                    actions.push({
                        type: 'create_followup',
                        label: '📅 Zaplanuj follow-up',
                        payload: payload ? this.safeJsonParse(payload) : {},
                    });
                    break;
                case 'send_email':
                    actions.push({
                        type: 'send_email',
                        label: '✉️ Wyślij email',
                        payload: payload ? this.safeJsonParse(payload) : {},
                    });
                    break;
            }
            cleanMessage = cleanMessage.replace(fullMatch, '');
        }
        return { cleanMessage: cleanMessage.trim(), actions };
    }
    safeJsonParse(str) {
        try {
            return JSON.parse(str);
        }
        catch {
            return {};
        }
    }
    generateSuggestions(message, context) {
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
    async generateOffer(userId, description, clientId) {
        if (!this.ai) {
            throw new Error('AI nie jest skonfigurowany');
        }
        const prompt = `Na podstawie poniższego opisu wygeneruj szczegółową ofertę handlową w formacie JSON.

OPIS: ${description}

Zwróć TYLKO JSON (bez żadnego dodatkowego tekstu, bez markdown) w formacie:
{
  "title": "Tytuł oferty",
  "items": [
    {
      "name": "Nazwa pozycji",
      "description": "Opis",
      "quantity": 1,
      "unit": "szt.",
      "unitPrice": 1000,
      "vatRate": 23
    }
  ],
  "notes": "Uwagi do oferty",
  "validDays": 14
}

Pamiętaj:
- Ceny podawaj netto w PLN
- Używaj realistycznych stawek rynkowych
- Dodaj 2-5 pozycji
- VAT zazwyczaj 23%`;
        try {
            const response = await this.ai.models.generateContent({
                model: config_1.config.gemini.model,
                contents: prompt,
            });
            const responseText = response.text || '';
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('Nie udało się wygenerować oferty');
        }
        catch (error) {
            console.error('Generate offer error:', error);
            throw error;
        }
    }
    async generateEmail(userId, type, context) {
        if (!this.ai) {
            throw new Error('AI nie jest skonfigurowany');
        }
        const templates = {
            offer_send: `Napisz profesjonalny email do klienta ${context.clientName} z przesłaniem oferty "${context.offerTitle || 'handlowej'}".`,
            followup: `Napisz uprzejmy email follow-up do klienta ${context.clientName} w sprawie wcześniejszej oferty.`,
            thank_you: `Napisz email z podziękowaniem dla klienta ${context.clientName} za współpracę.`,
            reminder: `Napisz delikatne przypomnienie dla klienta ${context.clientName} o zbliżającym się terminie.`,
        };
        const prompt = `${templates[type]}

${context.customContext ? `Dodatkowy kontekst: ${context.customContext}` : ''}

Zasady:
- Ton profesjonalny ale przyjazny
- Język polski
- Długość: 3-5 zdań
- Zakończ wezwaniem do działania
- Zwróć TYLKO treść emaila, bez tematu`;
        const response = await this.ai.models.generateContent({
            model: config_1.config.gemini.model,
            contents: prompt,
        });
        return response.text || '';
    }
    async analyzeClient(userId, clientId) {
        if (!this.ai) {
            throw new Error('AI nie jest skonfigurowany');
        }
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
        if (!client) {
            throw new Error('Klient nie znaleziony');
        }
        const prompt = `Przeanalizuj tego klienta i zasugeruj działania:

KLIENT:
- Nazwa: ${client.name}
- Firma: ${client.company || 'Brak'}
- Typ: ${client.type}
- Email: ${client.email}
- Status: ${client.isActive ? 'Aktywny' : 'Nieaktywny'}

OFERTY (${client.offers.length}):
${client.offers.map(o => `- ${o.title}: ${o.status} - ${o.totalGross} PLN`).join('\n') || 'Brak'}

UMOWY (${client.contracts.length}):
${client.contracts.map(c => `- ${c.title}: ${c.status}`).join('\n') || 'Brak'}

FOLLOW-UPY (${client.followUps.length}):
${client.followUps.map(f => `- ${f.title}: ${f.status} (${f.type})`).join('\n') || 'Brak'}

Zwróć TYLKO JSON (bez żadnego dodatkowego tekstu, bez markdown) w formacie:
{
  "score": 7,
  "potential": "wysoki",
  "summary": "Krótkie podsumowanie",
  "recommendations": ["Rekomendacja 1", "Rekomendacja 2"],
  "nextAction": "Sugerowane następne działanie",
  "risks": ["Potencjalne ryzyko 1"]
}`;
        const response = await this.ai.models.generateContent({
            model: config_1.config.gemini.model,
            contents: prompt,
        });
        const responseText = response.text || '';
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        let result;
        if (jsonMatch) {
            result = JSON.parse(jsonMatch[0]);
        }
        else {
            result = {
                score: 5,
                potential: 'średni',
                summary: responseText,
                recommendations: [],
                nextAction: 'Skontaktuj się z klientem',
                risks: [],
            };
        }
        cache_1.aiCache.set(cacheKey, result, cache_1.CACHE_TTL.CLIENT_ANALYSIS);
        return result;
    }
    async generatePostMortem(userId, offerId, outcome) {
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
        const fallbackInsight = {
            summary: `Oferta ${offer.number} została ${outcome === 'ACCEPTED' ? 'zaakceptowana' : 'odrzucona'}.`,
            keyLessons: [],
            pricingInsight: 'Brak danych AI do analizy cenowej.',
            improvementSuggestions: [],
            industryNote: '',
        };
        if (!this.ai) {
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
        const itemsList = offer.items.map(item => `- ${item.name}: ${item.unitPrice} PLN × ${item.quantity} ${item.unit} (VAT ${item.vatRate}%)${item.isOptional ? ' [opcjonalny]' : ''}`).join('\n');
        const prompt = `Przeanalizuj zakończoną ofertę handlową i wyciągnij wnioski na przyszłość.

OFERTA: ${offer.number} — ${offer.title}
WYNIK: ${outcome === 'ACCEPTED' ? 'ZAAKCEPTOWANA' : 'ODRZUCONA'}
KLIENT: ${offer.client.name}${offer.client.company ? ` (${offer.client.company})` : ''} — typ: ${offer.client.type}
WARTOŚĆ: ${offer.totalGross} PLN brutto

POZYCJE:
${itemsList}

LICZBA WYŚWIETLEŃ: ${offer.views.length}
TIMELINE INTERAKCJI (${interactionTimeline.length}):
${interactionTimeline.slice(0, 20).map(i => `${i.type} @ ${i.createdAt}`).join('\n')}

KOMENTARZE:
${commentsText}

Zwróć TYLKO JSON (bez markdown):
{
  "summary": "Krótkie 2-3 zdaniowe podsumowanie co się wydarzyło",
  "keyLessons": ["Lekcja 1", "Lekcja 2"],
  "pricingInsight": "Wnioski dotyczące wyceny — czy ceny były adekwatne",
  "improvementSuggestions": ["Sugestia 1", "Sugestia 2"],
  "industryNote": "Obserwacja dot. branży lub typu klienta"
}`;
        try {
            const response = await this.ai.models.generateContent({
                model: config_1.config.gemini.model,
                contents: prompt,
            });
            const responseText = response.text || '';
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            const insight = jsonMatch
                ? JSON.parse(jsonMatch[0])
                : fallbackInsight;
            await prisma_1.default.offerLegacyInsight.create({
                data: {
                    offerId,
                    userId,
                    outcome,
                    insights: insight,
                },
            });
            cache_1.aiCache.invalidatePattern(`price-insight:${userId}`);
            const { notificationService } = await Promise.resolve().then(() => __importStar(require('./notification.service')));
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
    async getPriceInsight(userId, itemName, category) {
        const cacheKey = (0, cache_1.buildCacheKey)('price-insight', userId, itemName.toLowerCase().trim(), category || '');
        const cached = cache_1.aiCache.get(cacheKey);
        if (cached) {
            console.log(`🔵 Price Insight cache hit: ${itemName}`);
            return cached;
        }
        const historicalItems = await prisma_1.default.offerItem.findMany({
            where: {
                name: { contains: itemName, mode: 'insensitive' },
                offer: { userId },
            },
            include: {
                offer: {
                    select: {
                        title: true,
                        status: true,
                        createdAt: true,
                        client: { select: { name: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        const prices = historicalItems.map(item => Number(item.unitPrice));
        const avgPrice = prices.length > 0 ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100 : 0;
        const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
        const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
        const formattedItems = historicalItems.map(item => ({
            name: item.name,
            unitPrice: Number(item.unitPrice),
            quantity: Number(item.quantity),
            unit: item.unit,
            offerTitle: item.offer.title,
            offerStatus: item.offer.status,
            clientName: item.offer.client?.name || 'Nieznany',
            date: item.offer.createdAt.toISOString(),
        }));
        const legacyInsights = await prisma_1.default.offerLegacyInsight.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: { outcome: true, insights: true },
        });
        if (!this.ai) {
            const result = this.buildPriceInsightResult(avgPrice, minPrice, maxPrice, historicalItems.length, formattedItems, {
                suggestedMin: minPrice || 0,
                suggestedMax: maxPrice || 0,
                marketAnalysis: 'AI nie jest skonfigurowany. Wyświetlono tylko dane historyczne.',
                marginWarning: null,
                confidence: 'low',
            });
            return result;
        }
        const historicalSummary = historicalItems.length > 0
            ? `Znaleziono ${historicalItems.length} rekordów.\nŚrednia: ${avgPrice} PLN, Min: ${minPrice} PLN, Max: ${maxPrice} PLN\nSzczegóły:\n${formattedItems.slice(0, 10).map(i => `  ${i.name}: ${i.unitPrice} PLN (${offerStatusLabels[i.offerStatus] || i.offerStatus}, klient: ${i.clientName})`).join('\n')}`
            : 'Brak danych historycznych dla tej pozycji.';
        const legacySummary = legacyInsights.length > 0
            ? legacyInsights.map(l => {
                const ins = l.insights;
                return `[${l.outcome}] ${ins.pricingInsight || 'brak wniosków cenowych'}`;
            }).join('\n')
            : 'Brak wniosków z poprzednich ofert.';
        const prompt = `Przeanalizuj cenę usługi/produktu i zasugeruj optymalne widełki cenowe.

USŁUGA/PRODUKT: "${itemName}"
${category ? `KATEGORIA: ${category}` : ''}

DANE HISTORYCZNE UŻYTKOWNIKA:
${historicalSummary}

WNIOSKI Z ZAKOŃCZONYCH OFERT (Feedback Loop):
${legacySummary}

Na podstawie danych historycznych użytkownika i Twojej wiedzy o cenach rynkowych w Polsce, zwróć TYLKO JSON (bez markdown):
{
  "suggestedMin": <number - dolna granica sugerowanej ceny netto w PLN>,
  "suggestedMax": <number - górna granica sugerowanej ceny netto w PLN>,
  "marketAnalysis": "<string - krótka analiza rynkowa 2-3 zdania po polsku>",
  "marginWarning": "<string | null - ostrzeżenie jeśli historyczne ceny są poniżej rynku, inaczej null>",
  "confidence": "<low | medium | high - na podstawie ilości danych historycznych>"
}`;
        try {
            const response = await this.ai.models.generateContent({
                model: config_1.config.gemini.model,
                contents: prompt,
            });
            const responseText = response.text || '';
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            const aiResult = jsonMatch
                ? JSON.parse(jsonMatch[0])
                : {
                    suggestedMin: minPrice || 0,
                    suggestedMax: maxPrice || 0,
                    marketAnalysis: 'Nie udało się wygenerować analizy AI.',
                    marginWarning: null,
                    confidence: 'low',
                };
            const result = this.buildPriceInsightResult(avgPrice, minPrice, maxPrice, historicalItems.length, formattedItems, {
                suggestedMin: Number(aiResult.suggestedMin) || minPrice,
                suggestedMax: Number(aiResult.suggestedMax) || maxPrice,
                marketAnalysis: String(aiResult.marketAnalysis || ''),
                marginWarning: aiResult.marginWarning ? String(aiResult.marginWarning) : null,
                confidence: (['low', 'medium', 'high'].includes(aiResult.confidence) ? aiResult.confidence : 'low'),
            });
            cache_1.aiCache.set(cacheKey, result, cache_1.CACHE_TTL.PRICE_INSIGHT);
            return result;
        }
        catch (error) {
            console.error('❌ Price Insight AI failed:', error);
            return this.buildPriceInsightResult(avgPrice, minPrice, maxPrice, historicalItems.length, formattedItems, {
                suggestedMin: minPrice || 0,
                suggestedMax: maxPrice || 0,
                marketAnalysis: 'Wystąpił błąd AI. Wyświetlono tylko dane historyczne.',
                marginWarning: null,
                confidence: 'low',
            });
        }
    }
    buildPriceInsightResult(avgPrice, minPrice, maxPrice, count, items, aiSuggestion) {
        return {
            historicalData: { avgPrice, minPrice, maxPrice, count, items },
            aiSuggestion,
        };
    }
    async getObserverInsight(userId, offerId) {
        const cacheKey = (0, cache_1.buildCacheKey)('observer', userId, offerId);
        const cached = cache_1.aiCache.get(cacheKey);
        if (cached) {
            console.log(`🔵 Observer cache hit: ${offerId}`);
            return cached;
        }
        const offer = await prisma_1.default.offer.findFirst({
            where: { id: offerId, userId },
            include: {
                items: { orderBy: { position: 'asc' } },
                client: { select: { name: true, company: true, type: true } },
                views: { orderBy: { viewedAt: 'asc' } },
                interactions: { orderBy: { createdAt: 'asc' }, take: 100 },
                comments: { orderBy: { createdAt: 'asc' } },
            },
        });
        if (!offer) {
            throw new Error('Oferta nie znaleziona');
        }
        const result = await this.buildObserverInsight(offer);
        cache_1.aiCache.set(cacheKey, result, cache_1.CACHE_TTL.OBSERVER);
        return result;
    }
    async buildObserverInsight(offer) {
        const views = offer.views;
        const interactions = offer.interactions;
        const comments = offer.comments;
        const durationsWithValue = views.filter(v => v.duration !== null).map(v => v.duration);
        const avgViewDuration = durationsWithValue.length > 0
            ? Math.round(durationsWithValue.reduce((a, b) => a + b, 0) / durationsWithValue.length)
            : null;
        let mostActiveTime = null;
        const allTimestamps = [
            ...views.map(v => v.viewedAt),
            ...interactions.map(i => i.createdAt),
        ];
        if (allTimestamps.length > 0) {
            const hourCounts = {};
            allTimestamps.forEach(ts => {
                const h = ts.getHours();
                hourCounts[h] = (hourCounts[h] || 0) + 1;
            });
            const topHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
            if (topHour) {
                mostActiveTime = `${topHour[0].padStart(2, '0')}:00`;
            }
        }
        const timeAnalysis = {
            totalViews: views.length,
            avgViewDuration,
            mostActiveTime,
        };
        if (views.length === 0 && interactions.length === 0) {
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
        if (!this.ai) {
            const interactionTypes = interactions.map(i => i.type);
            const hasSelections = interactionTypes.some(t => t === 'ITEM_SELECT' || t === 'ITEM_DESELECT');
            const hasComments = comments.filter(c => c.author === 'CLIENT').length > 0;
            return {
                summary: `Klient wyświetlił ofertę ${views.length} razy.${hasSelections ? ' Dokonywał zmian w wybranych pozycjach.' : ''}${hasComments ? ' Zadawał pytania przez komentarze.' : ''}`,
                keyFindings: [
                    `Liczba wyświetleń: ${views.length}`,
                    `Liczba interakcji: ${interactions.length}`,
                    hasComments ? `Klient zostawił ${comments.filter(c => c.author === 'CLIENT').length} komentarzy` : 'Brak komentarzy klienta',
                ].filter(Boolean),
                clientIntent: 'unknown',
                interestAreas: [],
                concerns: [],
                engagementScore: Math.min(10, Math.round((views.length + interactions.length) / 3)),
                timeAnalysis,
            };
        }
        const viewsData = views.slice(0, 15).map(v => `${v.viewedAt.toISOString()}${v.duration ? ` (${v.duration}s)` : ''}`).join('\n') || 'Brak wyświetleń';
        const interactionsData = interactions.slice(0, 30).map(i => {
            const details = i.details ? ` — ${JSON.stringify(i.details)}` : '';
            return `${i.type} @ ${i.createdAt.toISOString()}${details}`;
        }).join('\n') || 'Brak interakcji';
        const clientComments = comments.filter(c => c.author === 'CLIENT');
        const commentsData = clientComments.length > 0
            ? clientComments.map(c => `[${c.createdAt.toISOString()}] ${c.content}`).join('\n')
            : 'Brak komentarzy klienta';
        const itemsData = offer.items.map(item => `- ${item.name}: ${item.unitPrice} PLN × ${item.quantity} ${item.unit}${item.isOptional ? ' [opcjonalny]' : ''}${item.isSelected ? '' : ' [odznaczony]'}`).join('\n');
        const prompt = `Przeanalizuj zachowanie klienta na interaktywnej ofercie i określ jego intencje zakupowe.

OFERTA: ${offer.number} — ${offer.title}
KLIENT: ${offer.client.name}${offer.client.company ? ` (${offer.client.company})` : ''}, typ: ${offer.client.type}
WARTOŚĆ: ${offer.totalGross} PLN brutto
STATUS: ${offerStatusLabels[offer.status] || offer.status}

POZYCJE OFERTY:
${itemsData}

WYŚWIETLENIA (${views.length}):
${viewsData}

INTERAKCJE (${interactions.length}):
${interactionsData}

KOMENTARZE KLIENTA (${clientComments.length}):
${commentsData}

Na podstawie powyższych danych, zwróć TYLKO JSON (bez markdown):
{
  "summary": "<string - naturalny opis zachowania klienta po polsku, 3-4 zdania>",
  "keyFindings": ["<string>", "<string>"],
  "clientIntent": "<likely_accept | undecided | likely_reject | unknown>",
  "interestAreas": ["<string - czym klient się interesuje>"],
  "concerns": ["<string - potencjalne obawy klienta>"],
  "engagementScore": <number 1-10>
}`;
        try {
            const response = await this.ai.models.generateContent({
                model: config_1.config.gemini.model,
                contents: prompt,
            });
            const responseText = response.text || '';
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    summary: String(parsed.summary || ''),
                    keyFindings: Array.isArray(parsed.keyFindings) ? parsed.keyFindings.map(String) : [],
                    clientIntent: (['likely_accept', 'undecided', 'likely_reject', 'unknown'].includes(parsed.clientIntent) ? parsed.clientIntent : 'unknown'),
                    interestAreas: Array.isArray(parsed.interestAreas) ? parsed.interestAreas.map(String) : [],
                    concerns: Array.isArray(parsed.concerns) ? parsed.concerns.map(String) : [],
                    engagementScore: Math.min(10, Math.max(0, Number(parsed.engagementScore) || 0)),
                    timeAnalysis,
                };
            }
            throw new Error('Failed to parse Observer response');
        }
        catch (error) {
            console.error('❌ Observer AI failed:', error);
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
    async getClosingStrategy(userId, offerId) {
        const cacheKey = (0, cache_1.buildCacheKey)('closing', userId, offerId);
        const cached = cache_1.aiCache.get(cacheKey);
        if (cached) {
            console.log(`🔵 Closing Strategy cache hit: ${offerId}`);
            return cached;
        }
        let observerContext = null;
        try {
            const observer = await this.getObserverInsight(userId, offerId);
            observerContext = {
                summary: observer.summary,
                clientIntent: observer.clientIntent,
                concerns: observer.concerns,
                engagementScore: observer.engagementScore,
            };
        }
        catch (err) {
            console.error('❌ Observer failed for Closer, continuing:', err);
        }
        const offer = await prisma_1.default.offer.findFirst({
            where: { id: offerId, userId },
            include: {
                items: { orderBy: { position: 'asc' } },
                client: { select: { name: true, company: true, type: true } },
                comments: { orderBy: { createdAt: 'asc' } },
            },
        });
        if (!offer) {
            throw new Error('Oferta nie znaleziona');
        }
        const result = await this.buildClosingStrategy(offer, observerContext);
        cache_1.aiCache.set(cacheKey, result, cache_1.CACHE_TTL.CLOSING_STRATEGY);
        return result;
    }
    async buildClosingStrategy(offer, observerContext) {
        const clientComments = offer.comments.filter(c => c.author === 'CLIENT');
        const sellerComments = offer.comments.filter(c => c.author === 'SELLER');
        const fallbackStrategy = {
            aggressive: {
                title: 'Strategia asertywna',
                description: 'Podkreśl wartość oferty i unikalne korzyści.',
                suggestedResponse: `Dziękuję za zainteresowanie ofertą "${offer.title}". Chciałbym podkreślić, że nasza propozycja zawiera kompletne rozwiązanie dopasowane do Państwa potrzeb. Czy mogę odpowiedzieć na jakieś pytania?`,
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
                suggestedResponse: `W związku z naszą ofertą "${offer.title}" — mogę zaproponować specjalne warunki przy decyzji do końca tygodnia. Czy jest to realne z Państwa strony?`,
                maxDiscountPercent: 5,
            },
            contextSummary: observerContext?.summary || 'Brak danych o zachowaniu klienta.',
        };
        if (!this.ai) {
            return fallbackStrategy;
        }
        const itemsData = offer.items.map(item => `- ${item.name}: ${item.unitPrice} PLN × ${item.quantity} ${item.unit} (razem netto: ${item.totalNet} PLN)${item.isOptional ? ' [opcjonalny]' : ''}`).join('\n');
        const clientCommentsText = clientComments.length > 0
            ? clientComments.map(c => c.content).join('\n')
            : 'Brak komentarzy klienta';
        const sellerCommentsText = sellerComments.length > 0
            ? sellerComments.map(c => c.content).join('\n')
            : 'Brak odpowiedzi sprzedawcy';
        const observerSummary = observerContext
            ? `Intencja: ${observerContext.clientIntent}, Zaangażowanie: ${observerContext.engagementScore}/10\nObawy: ${observerContext.concerns.join(', ') || 'brak'}\nPodsumowanie: ${observerContext.summary}`
            : 'Brak danych z modułu Observer.';
        const prompt = `Na podstawie kontekstu oferty i zachowań klienta, wygeneruj 3 strategie negocjacyjne.

OFERTA: ${offer.number} — ${offer.title}
KLIENT: ${offer.client.name}${offer.client.company ? ` (${offer.client.company})` : ''}, typ: ${offer.client.type}
WARTOŚĆ: ${offer.totalGross} PLN brutto

POZYCJE:
${itemsData}

ANALIZA ZACHOWAŃ (Observer):
${observerSummary}

KOMENTARZE KLIENTA:
${clientCommentsText}

DOTYCHCZASOWE ODPOWIEDZI SPRZEDAWCY:
${sellerCommentsText}

Wygeneruj 3 strategie negocjacyjne. Każda z suggestedResponse gotowym do wklejenia jako odpowiedź w komentarzu (po polsku, profesjonalnie, 3-5 zdań).

Zwróć TYLKO JSON (bez markdown):
{
  "aggressive": {
    "title": "<string - nazwa strategii>",
    "description": "<string - opis podejścia 1-2 zdania>",
    "suggestedResponse": "<string - gotowa odpowiedź do wklejenia>",
    "riskLevel": "<low | medium | high>"
  },
  "partnership": {
    "title": "<string>",
    "description": "<string>",
    "suggestedResponse": "<string>",
    "proposedConcessions": ["<string - konkretne ustępstwo>"]
  },
  "quickClose": {
    "title": "<string>",
    "description": "<string>",
    "suggestedResponse": "<string>",
    "maxDiscountPercent": <number 1-15>
  },
  "contextSummary": "<string - podsumowanie kontekstu negocjacji po polsku>"
}`;
        try {
            const response = await this.ai.models.generateContent({
                model: config_1.config.gemini.model,
                contents: prompt,
            });
            const responseText = response.text || '';
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    aggressive: {
                        title: String(parsed.aggressive?.title || 'Strategia asertywna'),
                        description: String(parsed.aggressive?.description || ''),
                        suggestedResponse: String(parsed.aggressive?.suggestedResponse || ''),
                        riskLevel: (['low', 'medium', 'high'].includes(parsed.aggressive?.riskLevel) ? parsed.aggressive.riskLevel : 'medium'),
                    },
                    partnership: {
                        title: String(parsed.partnership?.title || 'Podejście partnerskie'),
                        description: String(parsed.partnership?.description || ''),
                        suggestedResponse: String(parsed.partnership?.suggestedResponse || ''),
                        proposedConcessions: Array.isArray(parsed.partnership?.proposedConcessions) ? parsed.partnership.proposedConcessions.map(String) : [],
                    },
                    quickClose: {
                        title: String(parsed.quickClose?.title || 'Szybkie domknięcie'),
                        description: String(parsed.quickClose?.description || ''),
                        suggestedResponse: String(parsed.quickClose?.suggestedResponse || ''),
                        maxDiscountPercent: Math.min(15, Math.max(0, Number(parsed.quickClose?.maxDiscountPercent) || 5)),
                    },
                    contextSummary: String(parsed.contextSummary || observerContext?.summary || ''),
                };
            }
            throw new Error('Failed to parse Closer response');
        }
        catch (error) {
            console.error('❌ Closing Strategy AI failed:', error);
            return fallbackStrategy;
        }
    }
    async getLatestInsights(userId, limit = 3) {
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
    clearConversationHistory(userId) {
        this.conversationHistories.delete(userId);
    }
}
exports.aiService = new AIService();
