"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insightsList = exports.latestInsights = exports.closingStrategy = exports.observerInsight = exports.priceInsight = exports.getSuggestions = exports.clearHistory = exports.analyzeClient = exports.generateEmail = exports.generateOffer = exports.chat = void 0;
const ai_1 = require("../services/ai");
const apiResponse_1 = require("../utils/apiResponse");
const chat = async (req, res) => {
    try {
        const userId = req.user.id;
        const { message, history = [] } = req.body;
        if (!message || typeof message !== 'string') {
            return (0, apiResponse_1.errorResponse)(res, 'VALIDATION_ERROR', 'Wiadomość jest wymagana', 400);
        }
        const response = await ai_1.aiService.chat(userId, message, history);
        return (0, apiResponse_1.successResponse)(res, response);
    }
    catch (error) {
        console.error('AI Chat Error:', error);
        const message = error instanceof Error ? error.message : 'Błąd AI';
        return (0, apiResponse_1.errorResponse)(res, 'AI_ERROR', message, 500);
    }
};
exports.chat = chat;
const generateOffer = async (req, res) => {
    try {
        const userId = req.user.id;
        const { description } = req.body;
        if (!description) {
            return (0, apiResponse_1.errorResponse)(res, 'VALIDATION_ERROR', 'Opis oferty jest wymagany', 400);
        }
        const offer = await ai_1.aiService.generateOffer(userId, description);
        return (0, apiResponse_1.successResponse)(res, offer);
    }
    catch (error) {
        console.error('Generate Offer Error:', error);
        const message = error instanceof Error ? error.message : 'Błąd generowania oferty';
        return (0, apiResponse_1.errorResponse)(res, 'AI_ERROR', message, 500);
    }
};
exports.generateOffer = generateOffer;
const generateEmail = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, clientName, offerTitle, customContext } = req.body;
        if (!type || !clientName) {
            return (0, apiResponse_1.errorResponse)(res, 'VALIDATION_ERROR', 'Typ emaila i nazwa klienta są wymagane', 400);
        }
        const validTypes = ['offer_send', 'followup', 'thank_you', 'reminder'];
        if (!validTypes.includes(type)) {
            return (0, apiResponse_1.errorResponse)(res, 'VALIDATION_ERROR', 'Nieprawidłowy typ emaila', 400);
        }
        const email = await ai_1.aiService.generateEmail(userId, type, {
            clientName,
            offerTitle,
            customContext,
        });
        return (0, apiResponse_1.successResponse)(res, { email });
    }
    catch (error) {
        console.error('Generate Email Error:', error);
        const message = error instanceof Error ? error.message : 'Błąd generowania emaila';
        return (0, apiResponse_1.errorResponse)(res, 'AI_ERROR', message, 500);
    }
};
exports.generateEmail = generateEmail;
const analyzeClient = async (req, res) => {
    try {
        const userId = req.user.id;
        const { clientId } = req.params;
        if (!clientId) {
            return (0, apiResponse_1.errorResponse)(res, 'VALIDATION_ERROR', 'ID klienta jest wymagane', 400);
        }
        const analysis = await ai_1.aiService.analyzeClient(userId, clientId);
        return (0, apiResponse_1.successResponse)(res, analysis);
    }
    catch (error) {
        console.error('Analyze Client Error:', error);
        const message = error instanceof Error ? error.message : 'Błąd analizy klienta';
        return (0, apiResponse_1.errorResponse)(res, 'AI_ERROR', message, 500);
    }
};
exports.analyzeClient = analyzeClient;
const clearHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        ai_1.aiService.clearConversationHistory(userId);
        return (0, apiResponse_1.successResponse)(res, { message: 'Historia konwersacji wyczyszczona' });
    }
    catch (error) {
        console.error('Clear History Error:', error);
        const message = error instanceof Error ? error.message : 'Błąd czyszczenia historii';
        return (0, apiResponse_1.errorResponse)(res, 'AI_ERROR', message, 500);
    }
};
exports.clearHistory = clearHistory;
const getSuggestions = async (req, res) => {
    try {
        const userId = req.user.id;
        const context = await ai_1.aiService.getUserContext(userId);
        const suggestions = [];
        if (context.stats?.pendingFollowUps && context.stats.pendingFollowUps > 0) {
            suggestions.push({
                type: 'warning',
                title: 'Zaległe follow-upy',
                message: `Masz ${context.stats.pendingFollowUps} zaległych follow-upów do wykonania`,
                action: { type: 'navigate', path: '/dashboard/followups?status=overdue' },
            });
        }
        const expiringOffers = context.offers?.filter((o) => {
            if (o.status !== 'SENT' || !o.validUntil)
                return false;
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
        const inactiveClients = context.clients?.filter((c) => !c.isActive);
        if (inactiveClients && inactiveClients.length > 5) {
            suggestions.push({
                type: 'tip',
                title: 'Reaktywacja klientów',
                message: `Masz ${inactiveClients.length} nieaktywnych klientów. Rozważ kampanię reaktywacyjną.`,
                action: { type: 'ai_prompt', prompt: 'Pomóż mi reaktywować nieaktywnych klientów' },
            });
        }
        return (0, apiResponse_1.successResponse)(res, { suggestions, stats: context.stats });
    }
    catch (error) {
        console.error('Get Suggestions Error:', error);
        const message = error instanceof Error ? error.message : 'Błąd pobierania sugestii';
        return (0, apiResponse_1.errorResponse)(res, 'AI_ERROR', message, 500);
    }
};
exports.getSuggestions = getSuggestions;
const priceInsight = async (req, res) => {
    try {
        const userId = req.user.id;
        const { itemName, category } = req.body;
        const result = await ai_1.aiService.getPriceInsight(userId, itemName, category);
        return (0, apiResponse_1.successResponse)(res, result);
    }
    catch (error) {
        console.error('Price Insight Error:', error);
        const message = error instanceof Error ? error.message : 'Błąd analizy cenowej';
        return (0, apiResponse_1.errorResponse)(res, 'AI_ERROR', message, 500);
    }
};
exports.priceInsight = priceInsight;
const observerInsight = async (req, res) => {
    try {
        const userId = req.user.id;
        const { offerId } = req.params;
        const result = await ai_1.aiService.getObserverInsight(userId, offerId);
        return (0, apiResponse_1.successResponse)(res, result);
    }
    catch (error) {
        console.error('Observer Insight Error:', error);
        const message = error instanceof Error ? error.message : 'Błąd analizy zachowań';
        return (0, apiResponse_1.errorResponse)(res, 'AI_ERROR', message, 500);
    }
};
exports.observerInsight = observerInsight;
const closingStrategy = async (req, res) => {
    try {
        const userId = req.user.id;
        const { offerId } = req.params;
        const result = await ai_1.aiService.getClosingStrategy(userId, offerId);
        return (0, apiResponse_1.successResponse)(res, result);
    }
    catch (error) {
        console.error('Closing Strategy Error:', error);
        const message = error instanceof Error ? error.message : 'Błąd generowania strategii';
        return (0, apiResponse_1.errorResponse)(res, 'AI_ERROR', message, 500);
    }
};
exports.closingStrategy = closingStrategy;
const latestInsights = async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = req.query.limit ? Number(req.query.limit) : 3;
        const result = await ai_1.aiService.getLatestInsights(userId, limit);
        return (0, apiResponse_1.successResponse)(res, result);
    }
    catch (error) {
        console.error('Latest Insights Error:', error);
        const message = error instanceof Error ? error.message : 'Błąd pobierania wniosków AI';
        return (0, apiResponse_1.errorResponse)(res, 'AI_ERROR', message, 500);
    }
};
exports.latestInsights = latestInsights;
const insightsList = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = req.query.page ? Number(req.query.page) : 1;
        const limit = req.query.limit ? Number(req.query.limit) : 10;
        const outcome = req.query.outcome;
        const dateFrom = req.query.dateFrom;
        const dateTo = req.query.dateTo;
        const search = req.query.search;
        const result = await ai_1.aiService.getInsightsList(userId, {
            page,
            limit,
            outcome,
            dateFrom,
            dateTo,
            search,
        });
        return (0, apiResponse_1.paginatedResponse)(res, result.data, result.total, page, limit);
    }
    catch (error) {
        console.error('Insights List Error:', error);
        const message = error instanceof Error ? error.message : 'Błąd pobierania listy wniosków AI';
        return (0, apiResponse_1.errorResponse)(res, 'AI_ERROR', message, 500);
    }
};
exports.insightsList = insightsList;
