// smartquote_backend/src/controllers/followupReminder.controller.ts
import { Request, Response } from 'express';
import { followUpReminderService } from '../services/followupReminder.service';
import { successResponse, errorResponse } from '../utils/apiResponse';

export const triggerReminders = async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers['x-cron-secret'];
        const expectedSecret = process.env.CRON_SECRET;

        if (expectedSecret && authHeader !== expectedSecret) {
            return errorResponse(res, 'UNAUTHORIZED', 'Invalid cron secret', 401);
        }

        const result = await followUpReminderService.processOverdueFollowUps();

        return successResponse(res, {
            processed: result.processed,
            errors: result.errors,
            skipped: result.skipped,
        });
    } catch (error: unknown) {
        console.error('[FollowUpReminder] Trigger error:', error);
        return errorResponse(res, 'INTERNAL_ERROR', 'Błąd przetwarzania przypomnień', 500);
    }
};

export const getReminderStatus = async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers['x-cron-secret'];
        const expectedSecret = process.env.CRON_SECRET;

        if (expectedSecret && authHeader !== expectedSecret) {
            return errorResponse(res, 'UNAUTHORIZED', 'Invalid cron secret', 401);
        }

        const status = followUpReminderService.getStatus();
        return successResponse(res, status);
    } catch (error: unknown) {
        console.error('[FollowUpReminder] Status error:', error);
        return errorResponse(res, 'INTERNAL_ERROR', 'Błąd pobierania statusu', 500);
    }
};