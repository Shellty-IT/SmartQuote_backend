// smartquote_backend/src/routes/offers.routes.ts

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

router.use(authenticate);

router.get('/stats', offersController.getStats);
router.get('/', validate(listOffersSchema), offersController.findAll);

router.get('/:id/pdf', offersController.generatePDF);
router.get('/:id/analytics', offersController.getAnalytics);
router.get('/:id/comments', offersController.getComments);

router.get('/:id', validate(getOfferSchema), offersController.findById);
router.post('/', validate(createOfferSchema), offersController.create);
router.post('/:id/duplicate', validate(getOfferSchema), offersController.duplicate);
router.post('/:id/publish', offersController.publish);
router.post('/:id/comments', offersController.addComment);

router.put('/:id', validate(updateOfferSchema), offersController.update);

router.delete('/:id', validate(getOfferSchema), offersController.delete);
router.delete('/:id/publish', offersController.unpublish);

export default router;