// smartquote_backend/src/controllers/notifications.controller.ts

import { Request, Response } from 'express';
import { notificationService } from '../services/notification.service';
import { successResponse, paginatedResponse, errorResponse } from '../utils/apiResponse';

export const getNotifications = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const page = parseInt(req.query.page as string || '1', 10);
        const limit = parseInt(req.query.limit as string || '10', 10);

        const result = await notificationService.list(userId, page, limit);
        return paginatedResponse(res, result.notifications, result.total, result.page, result.limit);
    } catch (error: unknown) {
        console.error('[Notifications] List error:', error);
        return errorResponse(res, 'INTERNAL_ERROR', 'Błąd pobierania powiadomień', 500);
    }
};

export const getUnreadCount = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const count = await notificationService.getUnreadCount(userId);
        return successResponse(res, { count });
    } catch (error: unknown) {
        console.error('[Notifications] UnreadCount error:', error);
        return errorResponse(res, 'INTERNAL_ERROR', 'Błąd pobierania liczby powiadomień', 500);
    }
};

export const markAsRead = async (req: Request<{ id: string }>, res: Response) => {
    try {
        const userId = req.user!.id;
        const notificationId = req.params.id;

        await notificationService.markAsRead(userId, notificationId);
        return successResponse(res, { marked: true });
    } catch (error: unknown) {
        console.error('[Notifications] MarkAsRead error:', error);
        return errorResponse(res, 'INTERNAL_ERROR', 'Błąd oznaczania powiadomienia', 500);
    }
};

export const markAllAsRead = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        await notificationService.markAllAsRead(userId);
        return successResponse(res, { marked: true });
    } catch (error: unknown) {
        console.error('[Notifications] MarkAllAsRead error:', error);
        return errorResponse(res, 'INTERNAL_ERROR', 'Błąd oznaczania powiadomień', 500);
    }
};

export const deleteNotification = async (req: Request<{ id: string }>, res: Response) => {
    try {
        const userId = req.user!.id;
        const notificationId = req.params.id;

        await notificationService.deleteNotification(userId, notificationId);
        return successResponse(res, { deleted: true });
    } catch (error: unknown) {
        console.error('[Notifications] Delete error:', error);
        return errorResponse(res, 'INTERNAL_ERROR', 'Błąd usuwania powiadomienia', 500);
    }
};