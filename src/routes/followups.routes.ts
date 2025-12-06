// src/routes/followups.routes.ts

import { Router } from 'express';
import followUpsController from '../controllers/followups.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth'; // Poprawny import
import {
    createFollowUpSchema,
    updateFollowUpSchema,
    updateStatusSchema,
} from '../validators/followups.validator';

const router = Router();

// Wszystkie trasy wymagają autoryzacji
router.use(authenticate);

// Statystyki i specjalne endpointy (przed /:id)
router.get('/stats', followUpsController.getStats);
router.get('/upcoming', followUpsController.getUpcoming);
router.get('/overdue', followUpsController.getOverdue);

// Bulk operations
router.delete('/bulk', followUpsController.deleteMany);

// Powiązane z encjami
router.get('/client/:clientId', followUpsController.getByClient);
router.get('/offer/:offerId', followUpsController.getByOffer);
router.get('/contract/:contractId', followUpsController.getByContract);

// Admin/CRON
router.post('/mark-overdue', followUpsController.markOverdue);

// CRUD
router.get('/', followUpsController.getAll);
router.get('/:id', followUpsController.getById);
router.post('/', validate(createFollowUpSchema), followUpsController.create);
router.put('/:id', validate(updateFollowUpSchema), followUpsController.update);
router.delete('/:id', followUpsController.delete);

// Status operations
router.patch('/:id/status', validate(updateStatusSchema), followUpsController.updateStatus);
router.patch('/:id/complete', followUpsController.complete);

export default router;