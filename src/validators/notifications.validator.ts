// smartquote_backend/src/validators/notifications.validator.ts

import { z } from 'zod';

export const listNotificationsSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).optional().default('1'),
        limit: z.string().regex(/^\d+$/).optional().default('10'),
    }),
});

export const notificationIdSchema = z.object({
    params: z.object({
        id: z.string().min(1),
    }),
});