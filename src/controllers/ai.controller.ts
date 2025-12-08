// src/controllers/ai.controller.ts
import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { aiService } from '../services/ai.service';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { AISuggestion } from '../types';  // ← Dodaj import

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
        const { description, clientId } = req.body;

        if (!description) {
            return errorResponse(res, 'VALIDATION_ERROR', 'Opis oferty jest wymagany', 400);
        }

        const offer = await aiService.generateOffer(userId, description, clientId);
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

        const suggestions: AISuggestion[] = [];  // ← Użyj typu

        // Zaległe follow-upy
        if (context.stats?.pendingFollowUps && context.stats.pendingFollowUps > 0) {
            suggestions.push({
                type: 'warning',
                title: 'Zaległe follow-upy',
                message: `Masz ${context.stats.pendingFollowUps} zaległych follow-upów do wykonania`,
                action: { type: 'navigate', path: '/dashboard/followups?status=overdue' },
            });
        }

        // Oferty do przypomnienia
        const expiringOffers = context.offers?.filter((o: { status: string; validUntil: Date | null }) => {
            if (o.status !== 'SENT' || !o.validUntil) return false;
            const daysLeft = Math.ceil((new Date(o.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
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

        // Nieaktywni klienci
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