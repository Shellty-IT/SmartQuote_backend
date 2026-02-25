"use strict";
// smartquote_backend/src/routes/notifications.routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const notifications_controller_1 = require("../controllers/notifications.controller");
const notifications_validator_1 = require("../validators/notifications.validator");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', (0, validate_1.validate)(notifications_validator_1.listNotificationsSchema), notifications_controller_1.getNotifications);
router.get('/unread-count', notifications_controller_1.getUnreadCount);
router.patch('/read-all', notifications_controller_1.markAllAsRead);
router.patch('/:id/read', (0, validate_1.validate)(notifications_validator_1.notificationIdSchema), notifications_controller_1.markAsRead);
router.delete('/:id', (0, validate_1.validate)(notifications_validator_1.notificationIdSchema), notifications_controller_1.deleteNotification);
exports.default = router;
