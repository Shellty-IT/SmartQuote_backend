// src/routes/contracts.routes.ts
import { Router } from 'express';
import { contractsController } from '../controllers/contracts.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
    createContractSchema,
    updateContractSchema,
    updateContractStatusSchema,
} from '../validators/contracts.validator';

const router = Router();

router.use(authenticate);

router.get('/', contractsController.getContracts.bind(contractsController));
router.get('/stats', contractsController.getContractsStats.bind(contractsController));
router.get('/:id/pdf', contractsController.generateContractPDF.bind(contractsController));
router.get('/:id', contractsController.getContractById.bind(contractsController));

router.post('/', validate(createContractSchema), contractsController.createContract.bind(contractsController));
router.post('/from-offer/:offerId', contractsController.createContractFromOffer.bind(contractsController));
router.post('/:id/publish', contractsController.publishContract.bind(contractsController));

router.put('/:id', validate(updateContractSchema), contractsController.updateContract.bind(contractsController));
router.put('/:id/status', validate(updateContractStatusSchema), contractsController.updateContractStatus.bind(contractsController));

router.delete('/:id/publish', contractsController.unpublishContract.bind(contractsController));
router.delete('/:id', contractsController.deleteContract.bind(contractsController));

export default router;