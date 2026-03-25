// smartquote_backend/src/controllers/ai.controller.ts
import { Response } from 'express';
import { AuthenticatedRequest, AISuggestion } from '../types';
import { aiService } from '../services/ai';
import { successResponse, paginatedResponse, errorResponse } from '../utils/apiResponse';

export const chat = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { message, history = [] } = req.body;

        if (!message || typeof message !== 'string') {
            return errorResponse(res, 'VALIDATION_ERROR', 'Wiadomość jest wymagana', 400);
        }

        const response = await aiService.chat(userId, message, history);
        return successResponse(res, response);
    } catch (error: unknown) {
        console.error('AI Chat Error:', error);
        const message = error instanceof Error ? error.message : 'Błąd AI';
        return errorResponse(res, 'AI_ERROR', message, 500);
    }
};

export const generateOffer = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { description } = req.body;

        if (!description) {
            return errorResponse(res, 'VALIDATION_ERROR', 'Opis oferty jest wymagany', 400);
        }

        const offer = await aiService.generateOffer(userId, description);
        return successResponse(res, offer);
    } catch (error: unknown) {
        console.error('Generate Offer Error:', error);
        const message = error instanceof Error ? error.message : 'Błąd generowania oferty';
        return errorResponse(res, 'AI_ERROR', message, 500);
    }
};

export const generateEmail = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { type, clientName, offerTitle, customContext } = req.body;

        if (!type || !clientName) {
            return errorResponse(res, 'VALIDATION_ERROR', 'Typ emaila i nazwa klienta są wymagane', 400);
        }

        const validTypes = ['offer_send', 'followup', 'thank_you', 'reminder'];
        if (!validTypes.includes(type)) {
            return errorResponse(res, 'VALIDATION_ERROR', 'Nieprawidłowy typ emaila', 400);
        }

        const email = await aiService.generateEmail(userId, type, {
            clientName,
            offerTitle,
            customContext,
        });

        return successResponse(res, { email });
    } catch (error: unknown) {
        console.error('Generate Email Error:', error);
        const message = error instanceof Error ? error.message : 'Błąd generowania emaila';
        return errorResponse(res, 'AI_ERROR', message, 500);
    }
};

export const analyzeClient = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { clientId } = req.params;

        if (!clientId) {
            return errorResponse(res, 'VALIDATION_ERROR', 'ID klienta jest wymagane', 400);
        }

        const analysis = await aiService.analyzeClient(userId, clientId);
        return successResponse(res, analysis);
    } catch (error: unknown) {
        console.error('Analyze Client Error:', error);
        const message = error instanceof Error ? error.message : 'Błąd analizy klienta';
        return errorResponse(res, 'AI_ERROR', message, 500);
    }
};

export const clearHistory = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        aiService.clearConversationHistory(userId);
        return successResponse(res, { message: 'Historia konwersacji wyczyszczona' });
    } catch (error: unknown) {
        console.error('Clear History Error:', error);
        const message = error instanceof Error ? error.message : 'Błąd czyszczenia historii';
        return errorResponse(res, 'AI_ERROR', message, 500);
    }
};

export const getSuggestions = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const context = await aiService.getUserContext(userId);

        const suggestions: AISuggestion[] = [];

        if (context.stats?.pendingFollowUps && context.stats.pendingFollowUps > 0) {
            suggestions.push({
                type: 'warning',
                title: 'Zaległe follow-upy',
                message: `Masz ${context.stats.pendingFollowUps} zaległych follow-upów do wykonania`,
                action: { type: 'navigate', path: '/dashboard/followups?status=overdue' },
            });
        }

        const expiringOffers = context.offers?.filter((o: {
            status: string;
            validUntil: Date | null | undefined;
        }) => {
            if (o.status !== 'SENT' || !o.validUntil) return false;
            const daysLeft = Math.ceil(
                (new Date(o.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            return daysLeft > 0 && daysLeft <= 7;
        });

        if (expiringOffers && expiringOffers.length > 0) {
            suggestions.push({
                type: 'info',
                title: 'Oferty wygasające wkrótce',
                message: `${expiringOffers.length} ofert wygasa w ciągu 7 dni`,
                action: { type: 'navigate', path: '/dashboard/offers?expiring=true' },
            });
        }

        const inactiveClients = context.clients?.filter((c: { isActive: boolean }) => !c.isActive);
        if (inactiveClients && inactiveClients.length > 5) {
            suggestions.push({
                type: 'tip',
                title: 'Reaktywacja klientów',
                message: `Masz ${inactiveClients.length} nieaktywnych klientów. Rozważ kampanię reaktywacyjną.`,
                action: { type: 'ai_prompt', prompt: 'Pomóż mi reaktywować nieaktywnych klientów' },
            });
        }

        return successResponse(res, { suggestions, stats: context.stats });
    } catch (error: unknown) {
        console.error('Get Suggestions Error:', error);
        const message = error instanceof Error ? error.message : 'Błąd pobierania sugestii';
        return errorResponse(res, 'AI_ERROR', message, 500);
    }
};

export const priceInsight = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { itemName, category } = req.body;

        const result = await aiService.getPriceInsight(userId, itemName, category);
        return successResponse(res, result);
    } catch (error: unknown) {
        console.error('Price Insight Error:', error);
        const message = error instanceof Error ? error.message : 'Błąd analizy cenowej';
        return errorResponse(res, 'AI_ERROR', message, 500);
    }
};

export const observerInsight = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { offerId } = req.params;

        const result = await aiService.getObserverInsight(userId, offerId);
        return successResponse(res, result);
    } catch (error: unknown) {
        console.error('Observer Insight Error:', error);
        const message = error instanceof Error ? error.message : 'Błąd analizy zachowań';
        return errorResponse(res, 'AI_ERROR', message, 500);
    }
};

export const closingStrategy = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { offerId } = req.params;

        const result = await aiService.getClosingStrategy(userId, offerId);
        return successResponse(res, result);
    } catch (error: unknown) {
        console.error('Closing Strategy Error:', error);
        const message = error instanceof Error ? error.message : 'Błąd generowania strategii';
        return errorResponse(res, 'AI_ERROR', message, 500);
    }
};

export const latestInsights = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const limit = req.query.limit ? Number(req.query.limit) : 3;

        const result = await aiService.getLatestInsights(userId, limit);
        return successResponse(res, result);
    } catch (error: unknown) {
        console.error('Latest Insights Error:', error);
        const message = error instanceof Error ? error.message : 'Błąd pobierania wniosków AI';
        return errorResponse(res, 'AI_ERROR', message, 500);
    }
};

export const insightsList = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const page = req.query.page ? Number(req.query.page) : 1;
        const limit = req.query.limit ? Number(req.query.limit) : 10;
        const outcome = req.query.outcome as 'ACCEPTED' | 'REJECTED' | undefined;
        const dateFrom = req.query.dateFrom as string | undefined;
        const dateTo = req.query.dateTo as string | undefined;
        const search = req.query.search as string | undefined;

        const result = await aiService.getInsightsList(userId, {
            page,
            limit,
            outcome,
            dateFrom,
            dateTo,
            search,
        });
        return paginatedResponse(res, result.data, result.total, page, limit);
    } catch (error: unknown) {
        console.error('Insights List Error:', error);
        const message = error instanceof Error ? error.message : 'Błąd pobierania listy wniosków AI';
        return errorResponse(res, 'AI_ERROR', message, 500);
    }
};