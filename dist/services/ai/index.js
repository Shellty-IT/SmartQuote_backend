"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiService = void 0;
const core_1 = require("./core");
const chat_1 = require("./chat");
const analysis_1 = require("./analysis");
const feedback_1 = require("./feedback");
class AIService {
    constructor() {
        this.conversationHistories = new Map();
        this.ai = (0, core_1.initAI)();
    }
    getUserContext(userId) {
        return (0, chat_1.getUserContext)(userId);
    }
    chat(userId, message, conversationHistory = []) {
        return (0, chat_1.chat)(this.ai, userId, message, conversationHistory);
    }
    generateOffer(_userId, description) {
        return (0, chat_1.generateOffer)(this.ai, description);
    }
    generateEmail(_userId, type, context) {
        return (0, chat_1.generateEmail)(this.ai, type, context);
    }
    analyzeClient(userId, clientId) {
        return (0, chat_1.analyzeClient)(this.ai, userId, clientId);
    }
    getPriceInsight(userId, itemName, category) {
        return (0, analysis_1.getPriceInsight)(this.ai, userId, itemName, category);
    }
    getObserverInsight(userId, offerId) {
        return (0, analysis_1.getObserverInsight)(this.ai, userId, offerId);
    }
    getClosingStrategy(userId, offerId) {
        return (0, analysis_1.getClosingStrategy)(this.ai, userId, offerId);
    }
    generatePostMortem(userId, offerId, outcome) {
        return (0, feedback_1.generatePostMortem)(this.ai, userId, offerId, outcome);
    }
    getLatestInsights(userId, limit) {
        return (0, feedback_1.getLatestInsights)(userId, limit);
    }
    getInsightsList(userId, params) {
        return (0, feedback_1.getInsightsList)(userId, params);
    }
    clearConversationHistory(userId) {
        this.conversationHistories.delete(userId);
    }
}
exports.aiService = new AIService();
