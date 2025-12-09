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
// src/routes/ai.routes.ts
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const aiController = __importStar(require("../controllers/ai.controller"));
const ai_validator_1 = require("../validators/ai.validator");
const router = (0, express_1.Router)();
// Wszystkie endpointy wymagają autoryzacji
router.use(auth_1.authenticate);
// Główny czat z AI
router.post('/chat', (0, validate_1.validate)(ai_validator_1.chatSchema), aiController.chat);
// Generowanie oferty
router.post('/generate-offer', (0, validate_1.validate)(ai_validator_1.generateOfferSchema), aiController.generateOffer);
// Generowanie emaila
router.post('/generate-email', (0, validate_1.validate)(ai_validator_1.generateEmailSchema), aiController.generateEmail);
// Analiza klienta
router.get('/analyze-client/:clientId', (0, validate_1.validate)(ai_validator_1.analyzeClientSchema), aiController.analyzeClient);
// Inteligentne sugestie (bez walidacji - nie ma parametrów)
router.get('/suggestions', aiController.getSuggestions);
// Dodaj nowy endpoint
router.delete('/history', aiController.clearHistory);
exports.default = router;
