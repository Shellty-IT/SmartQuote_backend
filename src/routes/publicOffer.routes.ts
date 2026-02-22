// smartquote_backend/src/routes/publicOffer.routes.ts

import { Router } from 'express';
import { publicOfferController } from '../controllers/publicOffer.controller';
import { validate } from '../middleware/validate';
import {
    getPublicOfferSchema,
    viewPublicOfferSchema,
    acceptPublicOfferSchema,
    rejectPublicOfferSchema,
    commentPublicOfferSchema,
    selectionPublicOfferSchema,
} from '../validators/publicOffer.validator';

const router = Router();

router.get('/:token', validate(getPublicOfferSchema), publicOfferController.getOffer);
router.post('/:token/view', validate(viewPublicOfferSchema), publicOfferController.registerView);
router.post('/:token/accept', validate(acceptPublicOfferSchema), publicOfferController.acceptOffer);
router.post('/:token/reject', validate(rejectPublicOfferSchema), publicOfferController.rejectOffer);
router.post('/:token/comment', validate(commentPublicOfferSchema), publicOfferController.addComment);
router.patch('/:token/selection', validate(selectionPublicOfferSchema), publicOfferController.trackSelection);

export default router;