// smartquote_backend/src/routes/ai.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as aiController from '../controllers/ai.controller';
import {
    chatSchema,
    generateOfferSchema,
    generateEmailSchema,
    analyzeClientSchema,
    priceInsightSchema,
    observerInsightSchema,
    closingStrategySchema,
    latestInsightsSchema,
} from '../validators/ai.validator';

const router = Router();

router.use(authenticate);

router.post('/chat', validate(chatSchema), aiController.chat);

router.post('/generate-offer', validate(generateOfferSchema), aiController.generateOffer);

router.post('/generate-email', validate(generateEmailSchema), aiController.generateEmail);

router.get('/analyze-client/:clientId', validate(analyzeClientSchema), aiController.analyzeClient);

router.get('/suggestions', aiController.getSuggestions);

router.delete('/history', aiController.clearHistory);

router.post('/price-insight', validate(priceInsightSchema), aiController.priceInsight);

router.get('/observer/:offerId', validate(observerInsightSchema), aiController.observerInsight);

router.get('/closing-strategy/:offerId', validate(closingStrategySchema), aiController.closingStrategy);

router.get('/latest-insights', validate(latestInsightsSchema), aiController.latestInsights);

export default router;