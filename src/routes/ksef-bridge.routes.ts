// src/routes/ksef-bridge.routes.ts

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { ksefBridgeController } from '../controllers/ksef-bridge.controller';

const router = Router();

router.get('/preview/:offerId', authenticate, ksefBridgeController.getPreview);
router.post('/send', authenticate, ksefBridgeController.send);
router.post('/webhook', ksefBridgeController.webhook);

export default router;