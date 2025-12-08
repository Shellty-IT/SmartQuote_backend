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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSuggestions = exports.clearHistory = exports.analyzeClient = exports.generateEmail = exports.generateOffer = exports.chat = void 0;
const ai_service_1 = require("../services/ai.service");
const apiResponse_1 = require("../utils/apiResponse");
const chat = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { message, history = [] } = req.body;
        if (!message || typeof message !== 'string') {
            return (0, apiResponse_1.errorResponse)(res, 'VALIDATION_ERROR', 'Wiadomość jest wymagana', 400);
        }
        const response = yield ai_service_1.aiService.chat(userId, message, history);
        return (0, apiResponse_1.successResponse)(res, response);
    }
    catch (error) {
        console.error('AI Chat Error:', error);
        const message = error instanceof Error ? error.message : 'Błąd AI';
        return (0, apiResponse_1.errorResponse)(res, 'AI_ERROR', message, 500);
    }
});
exports.chat = chat;
const generateOffer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { description, clientId } = req.body;
        if (!description) {
            return (0, apiResponse_1.errorResponse)(res, 'VALIDATION_ERROR', 'Opis oferty jest wymagany', 400);
        }
        const offer = yield ai_service_1.aiService.generateOffer(userId, description, clientId);
        return (0, apiResponse_1.successResponse)(res, offer);
    }
    catch (error) {
        console.error('Generate Offer Error:', error);
        const message = error instanceof Error ? error.message : 'Błąd generowania oferty';
        return (0, apiResponse_1.errorResponse)(res, 'AI_ERROR', message, 500);
    }
});
exports.generateOffer = generateOffer;
const generateEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const email = yield ai_service_1.aiService.generateEmail(userId, type, {
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
});
exports.generateEmail = generateEmail;
const analyzeClient = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { clientId } = req.params;
        if (!clientId) {
            return (0, apiResponse_1.errorResponse)(res, 'VALIDATION_ERROR', 'ID klienta jest wymagane', 400);
        }
        const analysis = yield ai_service_1.aiService.analyzeClient(userId, clientId);
        return (0, apiResponse_1.successResponse)(res, analysis);
    }
    catch (error) {
        console.error('Analyze Client Error:', error);
        const message = error instanceof Error ? error.message : 'Błąd analizy klienta';
        return (0, apiResponse_1.errorResponse)(res, 'AI_ERROR', message, 500);
    }
});
exports.analyzeClient = analyzeClient;
const clearHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        ai_service_1.aiService.clearConversationHistory(userId);
        return (0, apiResponse_1.successResponse)(res, { message: 'Historia konwersacji wyczyszczona' });
    }
    catch (error) {
        console.error('Clear History Error:', error);
        const message = error instanceof Error ? error.message : 'Błąd czyszczenia historii';
        return (0, apiResponse_1.errorResponse)(res, 'AI_ERROR', message, 500);
    }
});
exports.clearHistory = clearHistory;
const getSuggestions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const userId = req.user.id;
        const context = yield ai_service_1.aiService.getUserContext(userId);
        const suggestions = []; // ← Użyj typu
        // Zaległe follow-upy
        if (((_a = context.stats) === null || _a === void 0 ? void 0 : _a.pendingFollowUps) && context.stats.pendingFollowUps > 0) {
            suggestions.push({
                type: 'warning',
                title: 'Zaległe follow-upy',
                message: `Masz ${context.stats.pendingFollowUps} zaległych follow-upów do wykonania`,
                action: { type: 'navigate', path: '/dashboard/followups?status=overdue' },
            });
        }
        // Oferty do przypomnienia
        const expiringOffers = (_b = context.offers) === null || _b === void 0 ? void 0 : _b.filter((o) => {
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
        // Nieaktywni klienci
        const inactiveClients = (_c = context.clients) === null || _c === void 0 ? void 0 : _c.filter((c) => !c.isActive);
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
});
exports.getSuggestions = getSuggestions;
