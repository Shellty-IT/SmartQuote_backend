// smartquote_backend/src/routes/publicContract.routes.ts
import { Router } from 'express';
import { publicContractController } from '../controllers/publicContract.controller';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const tokenSchema = z.object({
    params: z.object({
        token: z.string().min(1, 'Token jest wymagany'),
    }),
});

const router = Router();

router.get('/:token', validate(tokenSchema), publicContractController.getContract);
router.get('/:token/pdf', validate(tokenSchema), publicContractController.downloadPdf);

export default router;