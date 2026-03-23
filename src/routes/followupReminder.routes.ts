// smartquote_backend/src/routes/followupReminder.routes.ts
import { Router } from 'express';
import * as reminderController from '../controllers/followupReminder.controller';

const router = Router();

router.post('/trigger', reminderController.triggerReminders);

router.get('/status', reminderController.getReminderStatus);

export default router;