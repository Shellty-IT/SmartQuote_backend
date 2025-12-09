// smartquote_backend/src/routes/settings.routes.ts

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as settingsController from '../controllers/settings.controller';
import * as v from '../validators/settings.validator';

const router = Router();

// Wszystkie routes wymagają autoryzacji
router.use(authenticate);

// Get all settings at once
router.get('/', settingsController.getAllSettings);

// Profile
router.get('/profile', settingsController.getProfile);
router.put('/profile', validate(v.updateProfileSchema), settingsController.updateProfile);

// Password
router.put('/password', validate(v.changePasswordSchema), settingsController.changePassword);

// Settings (preferences)
router.get('/preferences', settingsController.getSettings);
router.put('/preferences', validate(v.updateSettingsSchema), settingsController.updateSettings);

// Company Info
router.get('/company', settingsController.getCompanyInfo);
router.put('/company', validate(v.updateCompanyInfoSchema), settingsController.updateCompanyInfo);

// API Keys
router.get('/api-keys', settingsController.getApiKeys);
router.post('/api-keys', validate(v.createApiKeySchema), settingsController.createApiKey);
router.patch('/api-keys/:id/toggle', settingsController.toggleApiKey);
router.delete('/api-keys/:id', settingsController.deleteApiKey);

export default router;