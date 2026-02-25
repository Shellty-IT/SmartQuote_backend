"use strict";
// smartquote_backend/src/controllers/notifications.controller.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNotification = exports.markAllAsRead = exports.markAsRead = exports.getUnreadCount = exports.getNotifications = void 0;
const notification_service_1 = require("../services/notification.service");
const apiResponse_1 = require("../utils/apiResponse");
const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '10', 10);
        const result = await notification_service_1.notificationService.list(userId, page, limit);
        return (0, apiResponse_1.paginatedResponse)(res, result.notifications, result.total, result.page, result.limit);
    }
    catch (error) {
        console.error('[Notifications] List error:', error);
        return (0, apiResponse_1.errorResponse)(res, 'INTERNAL_ERROR', 'Błąd pobierania powiadomień', 500);
    }
};
exports.getNotifications = getNotifications;
const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;
        const count = await notification_service_1.notificationService.getUnreadCount(userId);
        return (0, apiResponse_1.successResponse)(res, { count });
    }
    catch (error) {
        console.error('[Notifications] UnreadCount error:', error);
        return (0, apiResponse_1.errorResponse)(res, 'INTERNAL_ERROR', 'Błąd pobierania liczby powiadomień', 500);
    }
};
exports.getUnreadCount = getUnreadCount;
const markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const notificationId = req.params.id;
        await notification_service_1.notificationService.markAsRead(userId, notificationId);
        return (0, apiResponse_1.successResponse)(res, { marked: true });
    }
    catch (error) {
        console.error('[Notifications] MarkAsRead error:', error);
        return (0, apiResponse_1.errorResponse)(res, 'INTERNAL_ERROR', 'Błąd oznaczania powiadomienia', 500);
    }
};
exports.markAsRead = markAsRead;
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        await notification_service_1.notificationService.markAllAsRead(userId);
        return (0, apiResponse_1.successResponse)(res, { marked: true });
    }
    catch (error) {
        console.error('[Notifications] MarkAllAsRead error:', error);
        return (0, apiResponse_1.errorResponse)(res, 'INTERNAL_ERROR', 'Błąd oznaczania powiadomień', 500);
    }
};
exports.markAllAsRead = markAllAsRead;
const deleteNotification = async (req, res) => {
    try {
        const userId = req.user.id;
        const notificationId = req.params.id;
        await notification_service_1.notificationService.deleteNotification(userId, notificationId);
        return (0, apiResponse_1.successResponse)(res, { deleted: true });
    }
    catch (error) {
        console.error('[Notifications] Delete error:', error);
        return (0, apiResponse_1.errorResponse)(res, 'INTERNAL_ERROR', 'Błąd usuwania powiadomienia', 500);
    }
};
exports.deleteNotification = deleteNotification;
