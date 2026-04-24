// src/validators/ksef-bridge.validator.ts
import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const ksefSendSchema = z.object({
    body: z
        .object({
            offerId: z.string().min(1, 'ID oferty jest wymagane'),
            issueDate: z.string().regex(dateRegex, 'Nieprawidłowy format daty (YYYY-MM-DD)'),
            dueDate: z.string().regex(dateRegex, 'Nieprawidłowy format daty (YYYY-MM-DD)'),
        })
        .refine(
            (data) => {
                const issue = new Date(data.issueDate);
                const due = new Date(data.dueDate);
                return due >= issue;
            },
            {
                message: 'Termin płatności nie może być wcześniejszy niż data wystawienia',
                path: ['dueDate'],
            }
        ),
});

export const ksefWebhookSchema = z.object({
    body: z.object({
        smartQuoteId: z.string().min(1, 'ID oferty SmartQuote jest wymagane'),
        action: z.enum(['approved', 'rejected'], {
            errorMap: () => ({ message: 'Akcja musi być "approved" lub "rejected"' }),
        }),
        externalId: z.string().optional(),
        message: z.string().optional(),
    }),
});

export type KsefSendInput = z.infer<typeof ksefSendSchema>['body'];
export type KsefWebhookInput = z.infer<typeof ksefWebhookSchema>['body'];