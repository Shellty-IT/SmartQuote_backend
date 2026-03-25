"use strict";
// src/validators/ksef-bridge.validator.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.ksefWebhookSchema = exports.ksefSendSchema = void 0;
const zod_1 = require("zod");
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
exports.ksefSendSchema = zod_1.z
    .object({
    offerId: zod_1.z.string().min(1, 'ID oferty jest wymagane'),
    issueDate: zod_1.z.string().regex(dateRegex, 'Nieprawidłowy format daty (YYYY-MM-DD)'),
    dueDate: zod_1.z.string().regex(dateRegex, 'Nieprawidłowy format daty (YYYY-MM-DD)'),
})
    .refine((data) => {
    const issue = new Date(data.issueDate);
    const due = new Date(data.dueDate);
    return due >= issue;
}, {
    message: 'Termin płatności nie może być wcześniejszy niż data wystawienia',
    path: ['dueDate'],
});
exports.ksefWebhookSchema = zod_1.z.object({
    smartQuoteId: zod_1.z.string().min(1, 'ID oferty SmartQuote jest wymagane'),
    action: zod_1.z.enum(['approved', 'rejected'], {
        errorMap: () => ({ message: 'Akcja musi być "approved" lub "rejected"' }),
    }),
    externalId: zod_1.z.string().optional(),
    message: zod_1.z.string().optional(),
});
