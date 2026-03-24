"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReminderStatus = exports.triggerReminders = void 0;
const followupReminder_service_1 = require("../services/followupReminder.service");
const apiResponse_1 = require("../utils/apiResponse");
const triggerReminders = async (req, res) => {
    try {
        const authHeader = req.headers['x-cron-secret'];
        const expectedSecret = process.env.CRON_SECRET;
        if (expectedSecret && authHeader !== expectedSecret) {
            return (0, apiResponse_1.errorResponse)(res, 'UNAUTHORIZED', 'Invalid cron secret', 401);
        }
        const result = await followupReminder_service_1.followUpReminderService.processOverdueFollowUps();
        return (0, apiResponse_1.successResponse)(res, {
            processed: result.processed,
            errors: result.errors,
            skipped: result.skipped,
        });
    }
    catch (error) {
        console.error('[FollowUpReminder] Trigger error:', error);
        return (0, apiResponse_1.errorResponse)(res, 'INTERNAL_ERROR', 'Błąd przetwarzania przypomnień', 500);
    }
};
exports.triggerReminders = triggerReminders;
const getReminderStatus = async (req, res) => {
    try {
        const authHeader = req.headers['x-cron-secret'];
        const expectedSecret = process.env.CRON_SECRET;
        if (expectedSecret && authHeader !== expectedSecret) {
            return (0, apiResponse_1.errorResponse)(res, 'UNAUTHORIZED', 'Invalid cron secret', 401);
        }
        const status = followupReminder_service_1.followUpReminderService.getStatus();
        return (0, apiResponse_1.successResponse)(res, status);
    }
    catch (error) {
        console.error('[FollowUpReminder] Status error:', error);
        return (0, apiResponse_1.errorResponse)(res, 'INTERNAL_ERROR', 'Błąd pobierania statusu', 500);
    }
};
exports.getReminderStatus = getReminderStatus;
