// smartquote_backend/src/routes/contracts.routes.ts

import { Router } from 'express';
import contractsController from '../controllers/contracts.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
    createContractSchema,
    updateContractSchema,
    updateContractStatusSchema
} from '../validators/contracts.validator';

const router = Router();

// Wszystkie routes wymagają autoryzacji
router.use(authenticate);

// GET /api/contracts
router.get('/', contractsController.getContracts);

// GET /api/contracts/stats
router.get('/stats', contractsController.getContractsStats);

// GET /api/contracts/:id/pdf - WAŻNE: przed /:id żeby nie było konfliktu
router.get('/:id/pdf', contractsController.generateContractPDF);

// GET /api/contracts/:id
router.get('/:id', contractsController.getContractById);

// POST /api/contracts
router.post('/', validate(createContractSchema), contractsController.createContract);

// POST /api/contracts/from-offer/:offerId
router.post('/from-offer/:offerId', contractsController.createContractFromOffer);

// PUT /api/contracts/:id
router.put('/:id', validate(updateContractSchema), contractsController.updateContract);

// PUT /api/contracts/:id/status
router.put('/:id/status', validate(updateContractStatusSchema), contractsController.updateContractStatus);

// DELETE /api/contracts/:id
router.delete('/:id', contractsController.deleteContract);

export default router;