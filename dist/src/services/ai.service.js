"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiService = void 0;
// src/services/ai.service.ts
const genai_1 = require("@google/genai");
const config_1 = require("../config");
const prisma_1 = __importDefault(require("../lib/prisma"));
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
    /**
     * Pobiera kontekst użytkownika z bazy danych
     */
    getUserContext(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const [clients, offers, contracts, followUps] = yield Promise.all([
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
            // Statystyki
            const stats = {
                totalClients: yield prisma_1.default.client.count({ where: { userId } }),
                activeOffers: yield prisma_1.default.offer.count({
                    where: { userId, status: { in: ['DRAFT', 'SENT', 'NEGOTIATION'] } }
                }),
                pendingFollowUps: yield prisma_1.default.followUp.count({
                    where: { userId, status: 'PENDING', dueDate: { lte: new Date() } }
                }),
                monthlyRevenue: yield this.calculateMonthlyRevenue(userId),
            };
            return { userId, clients, offers, contracts, followUps, stats };
        });
    }
    calculateMonthlyRevenue(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            const result = yield prisma_1.default.offer.aggregate({
                where: {
                    userId,
                    status: 'ACCEPTED',
                    updatedAt: { gte: startOfMonth },
                },
                _sum: { totalGross: true },
            });
            return ((_a = result._sum.totalGross) === null || _a === void 0 ? void 0 : _a.toNumber()) || 0;
        });
    }
    /**
     * Buduje system prompt z kontekstem użytkownika
     */
    buildSystemPrompt(context) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        return `Jesteś SmartQuote AI - inteligentnym asystentem do zarządzania ofertami, umowami i relacjami z klientami.

TWOJE MOŻLIWOŚCI:
1. Pomagasz tworzyć profesjonalne oferty handlowe
2. Analizujesz klientów i sugerujesz działania follow-up
3. Generujesz treści: emaile, opisy produktów, notatki
4. Odpowiadasz na pytania o dane w systemie
5. Sugerujesz optymalizacje i najlepsze praktyki sprzedażowe

KONTEKST UŻYTKOWNIKA:
- Liczba klientów: ${((_a = context.stats) === null || _a === void 0 ? void 0 : _a.totalClients) || 0}
- Aktywne oferty: ${((_b = context.stats) === null || _b === void 0 ? void 0 : _b.activeOffers) || 0}
- Zaległe follow-upy: ${((_c = context.stats) === null || _c === void 0 ? void 0 : _c.pendingFollowUps) || 0}
- Przychód w tym miesiącu: ${(_e = (_d = context.stats) === null || _d === void 0 ? void 0 : _d.monthlyRevenue) === null || _e === void 0 ? void 0 : _e.toLocaleString('pl-PL')} PLN

OSTATNI KLIENCI (do 10):
${((_f = context.clients) === null || _f === void 0 ? void 0 : _f.slice(0, 10).map(c => `- ${c.name}${c.company ? ` (${c.company})` : ''} - ${c.type === 'PERSON' ? 'Osoba' : 'Firma'}`).join('\n')) || 'Brak klientów'}

OSTATNIE OFERTY (do 5):
${((_g = context.offers) === null || _g === void 0 ? void 0 : _g.slice(0, 5).map(o => { var _a, _b; return `- ${o.number}: ${o.title} - ${offerStatusLabels[o.status] || o.status} - ${o.totalGross} PLN dla ${((_a = o.client) === null || _a === void 0 ? void 0 : _a.name) || ((_b = o.client) === null || _b === void 0 ? void 0 : _b.company)}`; }).join('\n')) || 'Brak ofert'}

ZALEGŁE FOLLOW-UPY:
${((_h = context.followUps) === null || _h === void 0 ? void 0 : _h.filter(f => f.status === 'PENDING').slice(0, 5).map(f => `- ${f.title} (${followUpTypeLabels[f.type] || f.type}) - priorytet: ${priorityLabels[f.priority] || f.priority} - termin: ${new Date(f.dueDate).toLocaleDateString('pl-PL')}`).join('\n')) || 'Brak zaległych follow-upów'}

ZASADY:
- Odpowiadaj zawsze po polsku
- Bądź konkretny i profesjonalny
- Formatuj odpowiedzi używając Markdown
- Jeśli nie masz wystarczających informacji, dopytaj
- Sugeruj konkretne kwoty w PLN gdy to możliwe
- Pamiętaj o stawkach VAT (23%, 8%, 5%, 0%)
- Używaj polskich nazw dla statusów i priorytetów`;
    }
    /**
     * Główna funkcja czatu z AI
     */
    chat(userId_1, message_1) {
        return __awaiter(this, arguments, void 0, function* (userId, message, conversationHistory = []) {
            var _a, _b;
            console.log('🤖 AI Chat called:', { userId, messageLength: message.length });
            if (!this.ai) {
                console.error('❌ AI not initialized - missing API key');
                return {
                    message: '⚠️ AI Asystent nie jest skonfigurowany. Dodaj GEMINI_API_KEY do zmiennych środowiskowych.',
                    suggestions: ['Skontaktuj się z administratorem'],
                };
            }
            try {
                // Pobierz kontekst użytkownika
                const context = yield this.getUserContext(userId);
                console.log('📊 User context loaded:', {
                    clients: (_a = context.clients) === null || _a === void 0 ? void 0 : _a.length,
                    offers: (_b = context.offers) === null || _b === void 0 ? void 0 : _b.length
                });
                // Zbuduj pełną wiadomość z kontekstem
                const systemPrompt = this.buildSystemPrompt(context);
                // Przygotuj historię konwersacji
                let fullPrompt = systemPrompt + '\n\n';
                // Dodaj poprzednie wiadomości z historii
                if (conversationHistory.length > 0) {
                    fullPrompt += 'POPRZEDNIA ROZMOWA:\n';
                    conversationHistory.forEach(msg => {
                        const role = msg.role === 'user' ? 'Użytkownik' : 'Asystent';
                        fullPrompt += `${role}: ${msg.content}\n`;
                    });
                    fullPrompt += '\n';
                }
                fullPrompt += `Użytkownik: ${message}\n\nAsystent:`;
                console.log('💬 Sending message to Gemini...');
                // Wyślij wiadomość do Gemini
                const response = yield this.ai.models.generateContent({
                    model: config_1.config.gemini.model,
                    contents: fullPrompt,
                });
                const responseText = response.text || '';
                console.log('✅ Gemini response received:', responseText.substring(0, 100) + '...');
                // Parsuj odpowiedź i wyciągnij akcje
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
        });
    }
    /**
     * Parsuje odpowiedź AI i wyciąga akcje
     */
    parseActions(response) {
        const actions = [];
        let cleanMessage = response;
        // Szukaj tagów akcji [AKCJA:typ]
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
        catch (_a) {
            return {};
        }
    }
    /**
     * Generuje sugestie kolejnych pytań
     */
    generateSuggestions(message, context) {
        var _a;
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
        if (((_a = context.stats) === null || _a === void 0 ? void 0 : _a.pendingFollowUps) && context.stats.pendingFollowUps > 0) {
            suggestions.push(`Mam ${context.stats.pendingFollowUps} zaległych follow-upów. Co powinienem zrobić?`);
        }
        // Domyślne sugestie
        if (suggestions.length === 0) {
            suggestions.push('Pomóż mi stworzyć ofertę');
            suggestions.push('Pokaż statystyki sprzedaży');
            suggestions.push('Jakie mam zaległe zadania?');
        }
        return suggestions.slice(0, 3);
    }
    /**
     * Generuje ofertę na podstawie opisu
     */
    generateOffer(userId, description, clientId) {
        return __awaiter(this, void 0, void 0, function* () {
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
                const response = yield this.ai.models.generateContent({
                    model: config_1.config.gemini.model,
                    contents: prompt,
                });
                const responseText = response.text || '';
                // Wyciągnij JSON z odpowiedzi
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
        });
    }
    /**
     * Generuje treść emaila
     */
    generateEmail(userId, type, context) {
        return __awaiter(this, void 0, void 0, function* () {
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
            const response = yield this.ai.models.generateContent({
                model: config_1.config.gemini.model,
                contents: prompt,
            });
            return response.text || '';
        });
    }
    /**
     * Analizuje klienta i sugeruje działania
     */
    analyzeClient(userId, clientId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.ai) {
                throw new Error('AI nie jest skonfigurowany');
            }
            const client = yield prisma_1.default.client.findFirst({
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
            const response = yield this.ai.models.generateContent({
                model: config_1.config.gemini.model,
                contents: prompt,
            });
            const responseText = response.text || '';
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            // Fallback
            return {
                score: 5,
                potential: 'średni',
                summary: responseText,
                recommendations: [],
                nextAction: 'Skontaktuj się z klientem',
                risks: [],
            };
        });
    }
    /**
     * Czyści historię konwersacji
     */
    clearConversationHistory(userId) {
        this.conversationHistories.delete(userId);
    }
}
exports.aiService = new AIService();
exports.default = exports.aiService;
