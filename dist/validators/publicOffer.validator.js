"use strict";
// smartquote_backend/src/validators/publicOffer.validator.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectionPublicOfferSchema = exports.commentPublicOfferSchema = exports.rejectPublicOfferSchema = exports.acceptPublicOfferSchema = exports.viewPublicOfferSchema = exports.getPublicOfferSchema = void 0;
const zod_1 = require("zod");
exports.getPublicOfferSchema = zod_1.z.object({
    params: zod_1.z.object({
        token: zod_1.z.string().min(1, 'Token jest wymagany'),
    }),
});
exports.viewPublicOfferSchema = zod_1.z.object({
    params: zod_1.z.object({
        token: zod_1.z.string().min(1, 'Token jest wymagany'),
    }),
});
exports.acceptPublicOfferSchema = zod_1.z.object({
    params: zod_1.z.object({
        token: zod_1.z.string().min(1, 'Token jest wymagany'),
    }),
    body: zod_1.z.object({
        confirmationChecked: zod_1.z
            .literal(true, {
            errorMap: () => ({ message: 'Potwierdzenie akceptacji jest wymagane' }),
        }),
        selectedVariant: zod_1.z.string().max(100).optional().nullable(),
        clientName: zod_1.z.string().max(200).optional().nullable(),
        clientEmail: zod_1.z.string().email('Nieprawidłowy adres email').max(300).optional().nullable(),
        selectedItems: zod_1.z
            .array(zod_1.z.object({
            id: zod_1.z.string().min(1, 'ID pozycji jest wymagane'),
            isSelected: zod_1.z.boolean(),
            quantity: zod_1.z.number().positive('Ilość musi być większa od 0'),
        }))
            .optional()
            .default([]),
    }),
});
exports.rejectPublicOfferSchema = zod_1.z.object({
    params: zod_1.z.object({
        token: zod_1.z.string().min(1, 'Token jest wymagany'),
    }),
    body: zod_1.z.object({
        reason: zod_1.z
            .string()
            .trim()
            .max(1000, 'Powód może mieć maksymalnie 1000 znaków')
            .optional(),
    }),
});
exports.commentPublicOfferSchema = zod_1.z.object({
    params: zod_1.z.object({
        token: zod_1.z.string().min(1, 'Token jest wymagany'),
    }),
    body: zod_1.z.object({
        content: zod_1.z
            .string()
            .trim()
            .min(1, 'Treść komentarza jest wymagana')
            .max(2000, 'Komentarz może mieć maksymalnie 2000 znaków'),
    }),
});
exports.selectionPublicOfferSchema = zod_1.z.object({
    params: zod_1.z.object({
        token: zod_1.z.string().min(1, 'Token jest wymagany'),
    }),
    body: zod_1.z.object({
        items: zod_1.z
            .array(zod_1.z.object({
            id: zod_1.z.string().min(1, 'ID pozycji jest wymagane'),
            isSelected: zod_1.z.boolean(),
            quantity: zod_1.z.number().positive('Ilość musi być większa od 0'),
        }))
            .min(1, 'Lista pozycji jest wymagana'),
        selectedVariant: zod_1.z.string().max(100).optional().nullable(),
    }),
});
