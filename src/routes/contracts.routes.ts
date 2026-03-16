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

router.use(authenticate);

router.get('/', contractsController.getContracts);
router.get('/stats', contractsController.getContractsStats);
router.get('/:id/pdf', contractsController.generateContractPDF);
router.get('/:id', contractsController.getContractById);

router.post('/', validate(createContractSchema), contractsController.createContract);
router.post('/from-offer/:offerId', contractsController.createContractFromOffer);
router.post('/:id/publish', contractsController.publishContract);

router.put('/:id', validate(updateContractSchema), contractsController.updateContract);
router.put('/:id/status', validate(updateContractStatusSchema), contractsController.updateContractStatus);

router.delete('/:id/publish', contractsController.unpublishContract);
router.delete('/:id', contractsController.deleteContract);

export default router;