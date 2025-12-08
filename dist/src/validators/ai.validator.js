"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeClientSchema = exports.generateEmailSchema = exports.generateOfferSchema = exports.chatSchema = void 0;
// src/validators/ai.validator.ts
const zod_1 = require("zod");
exports.chatSchema = zod_1.z.object({
    body: zod_1.z.object({
        message: zod_1.z.string().min(1, 'Wiadomość jest wymagana').max(2000),
        history: zod_1.z.array(zod_1.z.object({
            role: zod_1.z.enum(['user', 'assistant']),
            content: zod_1.z.string(),
            timestamp: zod_1.z.string().or(zod_1.z.date()).optional(),
        })).optional().default([]),
    }),
    query: zod_1.z.object({}).optional(),
    params: zod_1.z.object({}).optional(),
});
exports.generateOfferSchema = zod_1.z.object({
    body: zod_1.z.object({
        description: zod_1.z.string().min(10, 'Opis musi mieć minimum 10 znaków').max(2000),
        clientId: zod_1.z.string().uuid().optional(),
    }),
    query: zod_1.z.object({}).optional(),
    params: zod_1.z.object({}).optional(),
});
exports.generateEmailSchema = zod_1.z.object({
    body: zod_1.z.object({
        type: zod_1.z.enum(['offer_send', 'followup', 'thank_you', 'reminder']),
        clientName: zod_1.z.string().min(1),
        offerTitle: zod_1.z.string().optional(),
        customContext: zod_1.z.string().max(500).optional(),
    }),
    query: zod_1.z.object({}).optional(),
    params: zod_1.z.object({}).optional(),
});
exports.analyzeClientSchema = zod_1.z.object({
    body: zod_1.z.object({}).optional(),
    query: zod_1.z.object({}).optional(),
    params: zod_1.z.object({
        clientId: zod_1.z.string().uuid(),
    }),
});
