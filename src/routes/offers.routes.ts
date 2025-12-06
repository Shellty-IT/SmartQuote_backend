// backend/src/routes/offers.routes.ts

import { Router } from 'express';
import { offersController } from '../controllers/offers.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import {
    createOfferSchema,
    updateOfferSchema,
    getOfferSchema,
    listOffersSchema,
} from '../validators/offers.validator';

const router = Router();

// Wszystkie trasy wymagają autoryzacji
router.use(authenticate);

// Kolejność ma znaczenie! Bardziej specyficzne trasy najpierw
router.get('/stats', offersController.getStats);
router.get('/', validate(listOffersSchema), offersController.findAll);

// PDF musi być przed /:id żeby nie był matchowany jako id
router.get('/:id/pdf', offersController.generatePDF);

router.get('/:id', validate(getOfferSchema), offersController.findById);
router.post('/', validate(createOfferSchema), offersController.create);
router.post('/:id/duplicate', validate(getOfferSchema), offersController.duplicate);
router.put('/:id', validate(updateOfferSchema), offersController.update);
router.delete('/:id', validate(getOfferSchema), offersController.delete);

export default router;