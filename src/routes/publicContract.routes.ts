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

const signContractSchema = z.object({
    params: z.object({
        token: z.string().min(1, 'Token jest wymagany'),
    }),
    body: z.object({
        signerName: z.string().min(2, 'Imię i nazwisko musi mieć minimum 2 znaki'),
        signerEmail: z.string().email('Podaj prawidłowy adres email'),
        signatureImage: z.string().refine(
            (val) => val.startsWith('data:image/'),
            'Nieprawidłowy format podpisu'
        ),
    }),
});

const router = Router();

router.get('/:token', validate(tokenSchema), publicContractController.getContract);
router.get('/:token/pdf', validate(tokenSchema), publicContractController.downloadPdf);
router.post('/:token/sign', validate(signContractSchema), publicContractController.signContract);

export default router;