// src/routes/index.ts
import { Router } from 'express';
import authRoutes from './auth.routes';
import publicOfferRoutes from './publicOffer.routes';
import publicContractRoutes from './publicContract.routes';
import followupReminderRoutes from './followupReminder.routes';
import clientsRoutes from './clients.routes';
import offersRoutes from './offers.routes';
import contractsRoutes from './contracts.routes';
import followUpsRoutes from './followups.routes';
import aiRoutes from './ai.routes';
import settingsRoutes from './settings.routes';
import notificationsRoutes from './notifications.routes';
import ksefBridgeRoutes from './ksef-bridge.routes';
import emailComposerRoutes from './email-composer.routes';
import offerTemplatesRoutes from './offer-templates.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/public/offers', publicOfferRoutes);
router.use('/public/contracts', publicContractRoutes);
router.use('/cron/reminders', followupReminderRoutes);

router.use('/clients', clientsRoutes);
router.use('/offers', offersRoutes);
router.use('/contracts', contractsRoutes);
router.use('/followups', followUpsRoutes);
router.use('/ai', aiRoutes);
router.use('/settings', settingsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/ksef', ksefBridgeRoutes);
router.use('/emails', emailComposerRoutes);
router.use('/offer-templates', offerTemplatesRoutes);

export default router;