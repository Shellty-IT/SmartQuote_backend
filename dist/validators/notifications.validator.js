"use strict";
// smartquote_backend/src/validators/notifications.validator.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationIdSchema = exports.listNotificationsSchema = void 0;
const zod_1 = require("zod");
exports.listNotificationsSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().regex(/^\d+$/).optional().default('1'),
        limit: zod_1.z.string().regex(/^\d+$/).optional().default('10'),
    }),
});
exports.notificationIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1),
    }),
});
