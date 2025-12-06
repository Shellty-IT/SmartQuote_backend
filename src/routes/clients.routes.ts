import { Router } from 'express';
import { clientsController } from '../controllers/clients.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import {
    createClientSchema,
    updateClientSchema,
    getClientSchema,
    listClientsSchema,
} from '../validators/clients.validator';

const router = Router();

// Wszystkie trasy wymagają autoryzacji
router.use(authenticate);

router.get('/stats', clientsController.getStats);
router.get('/', validate(listClientsSchema), clientsController.findAll);
router.get('/:id', validate(getClientSchema), clientsController.findById);
router.post('/', validate(createClientSchema), clientsController.create);
router.put('/:id', validate(updateClientSchema), clientsController.update);
router.delete('/:id', validate(getClientSchema), clientsController.delete);

export default router;