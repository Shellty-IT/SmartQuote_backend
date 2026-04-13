// src/routes/offer-templates.routes.ts

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { offerTemplatesController } from '../controllers/offer-templates.controller';

const router = Router();

router.use(authenticate);

router.get('/categories', (req, res) => offerTemplatesController.getCategories(req, res));
router.get('/', (req, res) => offerTemplatesController.findAll(req, res));
router.get('/:id', (req, res) => offerTemplatesController.findById(req, res));
router.post('/', (req, res) => offerTemplatesController.create(req, res));
router.put('/:id', (req, res) => offerTemplatesController.update(req, res));
router.delete('/:id', (req, res) => offerTemplatesController.delete(req, res));

export default router;