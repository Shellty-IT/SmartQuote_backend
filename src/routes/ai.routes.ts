// src/routes/ai.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as aiController from '../controllers/ai.controller';
import {
    chatSchema,
    generateOfferSchema,
    generateEmailSchema,
    analyzeClientSchema
} from '../validators/ai.validator';

const router = Router();

// Wszystkie endpointy wymagają autoryzacji
router.use(authenticate);

// Główny czat z AI
router.post('/chat', validate(chatSchema), aiController.chat);

// Generowanie oferty
router.post('/generate-offer', validate(generateOfferSchema), aiController.generateOffer);

// Generowanie emaila
router.post('/generate-email', validate(generateEmailSchema), aiController.generateEmail);

// Analiza klienta
router.get('/analyze-client/:clientId', validate(analyzeClientSchema), aiController.analyzeClient);

// Inteligentne sugestie (bez walidacji - nie ma parametrów)
router.get('/suggestions', aiController.getSuggestions);

// Dodaj nowy endpoint
router.delete('/history', aiController.clearHistory);

export default router;