// src/routes/email-composer.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { emailComposerController } from '../controllers/email-composer.controller';
import {
    sendEmailSchema,
    updateDraftSchema,
    createTemplateSchema,
    updateTemplateSchema,
} from '../validators/email-composer.validator';

const router = Router();

router.use(authenticate);

router.get('/templates/list', emailComposerController.getTemplates);
router.post('/templates', validate(createTemplateSchema), emailComposerController.createTemplate);
router.get('/templates/:id', emailComposerController.getTemplateById);
router.put('/templates/:id', validate(updateTemplateSchema), emailComposerController.updateTemplate);
router.delete('/templates/:id', emailComposerController.deleteTemplate);

router.get('/', emailComposerController.getEmailLogs);
router.post('/', validate(sendEmailSchema), emailComposerController.sendEmail);
router.get('/:id', emailComposerController.getEmailLogById);
router.put('/:id/draft', validate(updateDraftSchema), emailComposerController.updateDraft);
router.post('/:id/send', emailComposerController.sendDraft);
router.delete('/:id', emailComposerController.deleteEmailLog);

export default router;