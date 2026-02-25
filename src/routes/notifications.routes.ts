// smartquote_backend/src/routes/notifications.routes.ts

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
} from '../controllers/notifications.controller';
import {
    listNotificationsSchema,
    notificationIdSchema,
} from '../validators/notifications.validator';

const router = Router();

router.use(authenticate);

router.get('/', validate(listNotificationsSchema), getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', validate(notificationIdSchema), markAsRead);
router.delete('/:id', validate(notificationIdSchema), deleteNotification);

export default router;