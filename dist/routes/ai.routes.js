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
Object.defineProperty(exports, "__esModule", { value: true });
// smartquote_backend/src/routes/ai.routes.ts
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const aiController = __importStar(require("../controllers/ai.controller"));
const ai_validator_1 = require("../validators/ai.validator");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.post('/chat', (0, validate_1.validate)(ai_validator_1.chatSchema), aiController.chat);
router.post('/generate-offer', (0, validate_1.validate)(ai_validator_1.generateOfferSchema), aiController.generateOffer);
router.post('/generate-email', (0, validate_1.validate)(ai_validator_1.generateEmailSchema), aiController.generateEmail);
router.get('/analyze-client/:clientId', (0, validate_1.validate)(ai_validator_1.analyzeClientSchema), aiController.analyzeClient);
router.get('/suggestions', aiController.getSuggestions);
router.delete('/history', aiController.clearHistory);
router.post('/price-insight', (0, validate_1.validate)(ai_validator_1.priceInsightSchema), aiController.priceInsight);
router.get('/observer/:offerId', (0, validate_1.validate)(ai_validator_1.observerInsightSchema), aiController.observerInsight);
router.get('/closing-strategy/:offerId', (0, validate_1.validate)(ai_validator_1.closingStrategySchema), aiController.closingStrategy);
router.get('/latest-insights', (0, validate_1.validate)(ai_validator_1.latestInsightsSchema), aiController.latestInsights);
router.get('/insights', (0, validate_1.validate)(ai_validator_1.insightsListSchema), aiController.insightsList);
exports.default = router;
