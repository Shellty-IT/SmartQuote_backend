// src/routes/ai.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { aiController } from '../controllers/ai.controller';
import {
    chatSchema,
    generateOfferSchema,
    generateEmailSchema,
    analyzeClientSchema,
    priceInsightSchema,
    offerIdParamSchema,
    latestInsightsSchema,
    insightsListSchema,
} from '../validators/ai.validator';

const router = Router();

router.use(authenticate);

router.post('/chat', validate(chatSchema), aiController.chat.bind(aiController));
router.post('/generate-offer', validate(generateOfferSchema), aiController.generateOffer.bind(aiController));
router.post('/generate-email', validate(generateEmailSchema), aiController.generateEmail.bind(aiController));
router.post('/price-insight', validate(priceInsightSchema), aiController.priceInsight.bind(aiController));

router.get('/analyze-client/:clientId', validate(analyzeClientSchema), aiController.analyzeClient.bind(aiController));
router.get('/suggestions', aiController.getSuggestions.bind(aiController));
router.get('/observer/:offerId', validate(offerIdParamSchema), aiController.observerInsight.bind(aiController));
router.get('/closing-strategy/:offerId', validate(offerIdParamSchema), aiController.closingStrategy.bind(aiController));
router.get('/latest-insights', validate(latestInsightsSchema), aiController.latestInsights.bind(aiController));
router.get('/insights', validate(insightsListSchema), aiController.insightsList.bind(aiController));

router.delete('/history', aiController.clearHistory.bind(aiController));

export default router;