// src/routes/settings.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as settingsController from '../controllers/settings.controller';
import * as v from '../validators/settings.validator';

const router = Router();

router.use(authenticate);

router.get('/', settingsController.getAllSettings);

router.get('/profile', settingsController.getProfile);
router.put('/profile', validate(v.updateProfileSchema), settingsController.updateProfile);

router.put('/password', validate(v.changePasswordSchema), settingsController.changePassword);

router.get('/preferences', settingsController.getSettings);
router.put('/preferences', validate(v.updateSettingsSchema), settingsController.updateSettings);

router.get('/company', settingsController.getCompanyInfo);
router.put('/company', validate(v.updateCompanyInfoSchema), settingsController.updateCompanyInfo);

router.get('/api-keys', settingsController.getApiKeys);
router.post('/api-keys', validate(v.createApiKeySchema), settingsController.createApiKey);
router.patch('/api-keys/:id/toggle', settingsController.toggleApiKey);
router.delete('/api-keys/:id', settingsController.deleteApiKey);

router.get('/sender-email', settingsController.getSenderEmail);
router.put('/sender-email', settingsController.updateSenderEmail);

router.get('/smtp', settingsController.getSmtpConfig);
router.put('/smtp', validate(v.updateSmtpConfigSchema), settingsController.updateSmtpConfig);
router.delete('/smtp', settingsController.deleteSmtpConfig);
router.post('/smtp/test', validate(v.testSmtpConnectionSchema), settingsController.testSmtpConnection);
router.post('/smtp/test-saved', settingsController.testSavedSmtpConnection);

export default router;