// smartquote_backend/src/services/ai.service.ts

import { GoogleGenAI } from '@google/genai';
import { Prisma } from '@prisma/client';
import { config } from '../config';
import prisma from '../lib/prisma';
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
} from '../types';

const priorityLabels: Record<string, string> = {
    URGENT: 'Pilny',
    HIGH: 'Wysoki',
    MEDIUM: 'Średni',
    LOW: 'Niski',
};

const followUpTypeLabels: Record<string, string> = {
    CALL: 'Telefon',
    EMAIL: 'Email',
    MEETING: 'Spotkanie',
    TASK: 'Zadanie',
    REMINDER: 'Przypomnienie',
    OTHER: 'Inne',
};

const offerStatusLabels: Record<string, string> = {
    DRAFT: 'Szkic',
    SENT: 'Wysłana',
    VIEWED: 'Przejrzana',
    NEGOTIATION: 'Negocjacje',
    ACCEPTED: 'Zaakceptowana',
    REJECTED: 'Odrzucona',
    EXPIRED: 'Wygasła',
};

class AIService {
    private ai: GoogleGenAI | null = null;
    private conversationHistories: Map<string, Array<{ role: string; content: string }>> = new Map();

    constructor() {
        if (config.gemini.apiKey) {
            this.ai = new GoogleGenAI({ apiKey: config.gemini.apiKey });
            console.log('✅ AI Service initialized with model:', config.gemini.model);
        } else {
            console.warn('⚠️ GEMINI_API_KEY not configured. AI features will be disabled.');
        }
    }

    async getUserContext(userId: string): Promise<AIContext> {
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

        const stats: AIStats = {
            totalClients: await prisma.client.count({ where: { userId } }),
            activeOffers: await prisma.offer.count({
                where: { userId, status: { in: ['DRAFT', 'SENT', 'NEGOTIATION'] } },
            }),
            pendingFollowUps: await prisma.followUp.count({
                where: { userId, status: 'PENDING', dueDate: { lte: new Date() } },
            }),
            monthlyRevenue: await this.calculateMonthlyRevenue(userId),
        };

        return { userId, clients, offers, contracts, followUps, stats };
    }

    private async calculateMonthlyRevenue(userId: string): Promise<number> {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const result = await prisma.offer.aggregate({
            where: {
                userId,
                status: 'ACCEPTED',
                updatedAt: { gte: startOfMonth },
            },
            _sum: { totalGross: true },
        });

        return result._sum.totalGross?.toNumber() || 0;
    }

    private buildSystemPrompt(context: AIContext): string {
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
${context.clients?.slice(0, 10).map(c =>
            `- ${c.name}${c.company ? ` (${c.company})` : ''} - ${c.type === 'PERSON' ? 'Osoba' : 'Firma'}`
        ).join('\n') || 'Brak klientów'}

OSTATNIE OFERTY (do 5):
${context.offers?.slice(0, 5).map(o =>
            `- ${o.number}: ${o.title} - ${offerStatusLabels[o.status] || o.status} - ${o.totalGross} PLN dla ${o.client?.name || o.client?.company}`
        ).join('\n') || 'Brak ofert'}

ZALEGŁE FOLLOW-UPY:
${context.followUps?.filter(f => f.status === 'PENDING').slice(0, 5).map(f =>
            `- ${f.title} (${followUpTypeLabels[f.type] || f.type}) - priorytet: ${priorityLabels[f.priority] || f.priority} - termin: ${new Date(f.dueDate).toLocaleDateString('pl-PL')}`
        ).join('\n') || 'Brak zaległych follow-upów'}

ZASADY:
- Odpowiadaj zawsze po polsku
- Bądź konkretny i profesjonalny
- Formatuj odpowiedzi używając Markdown
- Jeśli nie masz wystarczających informacji, dopytaj
- Sugeruj konkretne kwoty w PLN gdy to możliwe
- Pamiętaj o stawkach VAT (23%, 8%, 5%, 0%)
- Używaj polskich nazw dla statusów i priorytetów`;
    }

    async chat(userId: string, message: string, conversationHistory: AIMessage[] = []): Promise<AIResponse> {
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
                model: config.gemini.model,
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

    private parseActions(response: string): { cleanMessage: string; actions: AIAction[] } {
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

    private safeJsonParse(str: string): Record<string, unknown> {
        try {
            return JSON.parse(str);
        } catch {
            return {};
        }
    }

    private generateSuggestions(message: string, context: AIContext): string[] {
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

    async generateOffer(userId: string, description: string, clientId?: string): Promise<GeneratedOffer> {
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
                model: config.gemini.model,
                contents: prompt,
            });

            const responseText = response.text || '';

            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]) as GeneratedOffer;
            }

            throw new Error('Nie udało się wygenerować oferty');
        } catch (error: unknown) {
            console.error('Generate offer error:', error);
            throw error;
        }
    }

    async generateEmail(userId: string, type: EmailType, context: EmailGenerationContext): Promise<string> {
        if (!this.ai) {
            throw new Error('AI nie jest skonfigurowany');
        }

        const templates: Record<EmailType, string> = {
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
            model: config.gemini.model,
            contents: prompt,
        });

        return response.text || '';
    }

    async analyzeClient(userId: string, clientId: string): Promise<ClientAnalysis> {
        if (!this.ai) {
            throw new Error('AI nie jest skonfigurowany');
        }

        const client = await prisma.client.findFirst({
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
            model: config.gemini.model,
            contents: prompt,
        });

        const responseText = response.text || '';

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]) as ClientAnalysis;
        }

        return {
            score: 5,
            potential: 'średni',
            summary: responseText,
            recommendations: [],
            nextAction: 'Skontaktuj się z klientem',
            risks: [],
        };
    }

    async generatePostMortem(userId: string, offerId: string, outcome: 'ACCEPTED' | 'REJECTED'): Promise<void> {
        const existing = await prisma.offerLegacyInsight.findFirst({
            where: { offerId, userId },
        });

        if (existing) {
            console.log(`⏭️ Post-mortem already exists for offer ${offerId}`);
            return;
        }

        const offer = await prisma.offer.findFirst({
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
            await prisma.offerLegacyInsight.create({
                data: {
                    offerId,
                    userId,
                    outcome,
                    insights: fallbackInsight as unknown as Prisma.InputJsonValue,
                },
            });
            return;
        }

        const interactionTimeline = offer.interactions.map(i => ({
            type: i.type,
            createdAt: i.createdAt.toISOString(),
        }));

        const commentsText = offer.comments.map(c =>
            `[${c.author}] ${c.content}`
        ).join('\n') || 'Brak komentarzy';

        const itemsList = offer.items.map(item =>
            `- ${item.name}: ${item.unitPrice} PLN × ${item.quantity} ${item.unit} (VAT ${item.vatRate}%)${item.isOptional ? ' [opcjonalny]' : ''}`
        ).join('\n');

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
                model: config.gemini.model,
                contents: prompt,
            });

            const responseText = response.text || '';
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);

            const insight = jsonMatch
                ? JSON.parse(jsonMatch[0])
                : fallbackInsight;

            await prisma.offerLegacyInsight.create({
                data: {
                    offerId,
                    userId,
                    outcome,
                    insights: insight as unknown as Prisma.InputJsonValue,
                },
            });

            const { notificationService } = await import('./notification.service');
            notificationService.aiInsight(userId, {
                offerId,
                offerNumber: offer.number,
                outcome,
            }).catch((err: unknown) => {
                console.error('❌ AI Insight notification failed:', err);
            });

            console.log(`✅ Post-mortem saved for offer ${offer.number} [${outcome}]`);
        } catch (error: unknown) {
            console.error('❌ Post-mortem AI analysis failed, saving fallback:', error);

            await prisma.offerLegacyInsight.create({
                data: {
                    offerId,
                    userId,
                    outcome,
                    insights: fallbackInsight as unknown as Prisma.InputJsonValue,
                },
            });
        }
    }

    clearConversationHistory(userId: string): void {
        this.conversationHistories.delete(userId);
    }
}

export const aiService = new AIService();