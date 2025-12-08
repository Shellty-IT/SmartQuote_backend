// src/routes/followups.routes.ts

import { Router, Request, Response, NextFunction } from 'express';
import followUpsController from '../controllers/followups.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import {
    createFollowUpSchema,
    updateFollowUpSchema,
    updateStatusSchema,
} from '../validators/followups.validator';
import { AuthenticatedRequest } from '../types';

const router = Router();

// Wszystkie trasy wymagają autoryzacji
router.use(authenticate);

// Helper do obsługi async/await z typami
const asyncHandler = (
    fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>
) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req as AuthenticatedRequest, res, next)).catch(next);
    };
};

// Statystyki i specjalne endpointy (przed /:id)
router.get('/stats', asyncHandler(followUpsController.getStats));
router.get('/upcoming', asyncHandler(followUpsController.getUpcoming));
router.get('/overdue', asyncHandler(followUpsController.getOverdue));

// Bulk operations
router.delete('/bulk', asyncHandler(followUpsController.deleteMany));

// Powiązane z encjami
router.get('/client/:clientId', asyncHandler(followUpsController.getByClient));
router.get('/offer/:offerId', asyncHandler(followUpsController.getByOffer));
router.get('/contract/:contractId', asyncHandler(followUpsController.getByContract));

// Admin/CRON
router.post('/mark-overdue', asyncHandler(followUpsController.markOverdue));

// CRUD
router.get('/', asyncHandler(followUpsController.getAll));
router.get('/:id', asyncHandler(followUpsController.getById));
router.post('/', validate(createFollowUpSchema), asyncHandler(followUpsController.create));
router.put('/:id', validate(updateFollowUpSchema), asyncHandler(followUpsController.update));
router.delete('/:id', asyncHandler(followUpsController.delete));

// Status operations
router.patch('/:id/status', validate(updateStatusSchema), asyncHandler(followUpsController.updateStatus));
router.patch('/:id/complete', asyncHandler(followUpsController.complete));

export default router;