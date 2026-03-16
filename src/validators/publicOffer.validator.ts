// smartquote_backend/src/validators/publicOffer.validator.ts

import { z } from 'zod';

export const getPublicOfferSchema = z.object({
    params: z.object({
        token: z.string().min(1, 'Token jest wymagany'),
    }),
});

export const viewPublicOfferSchema = z.object({
    params: z.object({
        token: z.string().min(1, 'Token jest wymagany'),
    }),
});

export const acceptPublicOfferSchema = z.object({
    params: z.object({
        token: z.string().min(1, 'Token jest wymagany'),
    }),
    body: z.object({
        confirmationChecked: z
            .literal(true, {
                errorMap: () => ({ message: 'Potwierdzenie akceptacji jest wymagane' }),
            }),
        selectedVariant: z.string().max(100).optional().nullable(),
        selectedItems: z
            .array(
                z.object({
                    id: z.string().min(1, 'ID pozycji jest wymagane'),
                    isSelected: z.boolean(),
                    quantity: z.number().positive('Ilość musi być większa od 0'),
                })
            )
            .optional()
            .default([]),
    }),
});

export const rejectPublicOfferSchema = z.object({
    params: z.object({
        token: z.string().min(1, 'Token jest wymagany'),
    }),
    body: z.object({
        reason: z
            .string()
            .trim()
            .max(1000, 'Powód może mieć maksymalnie 1000 znaków')
            .optional(),
    }),
});

export const commentPublicOfferSchema = z.object({
    params: z.object({
        token: z.string().min(1, 'Token jest wymagany'),
    }),
    body: z.object({
        content: z
            .string()
            .trim()
            .min(1, 'Treść komentarza jest wymagana')
            .max(2000, 'Komentarz może mieć maksymalnie 2000 znaków'),
    }),
});

export const selectionPublicOfferSchema = z.object({
    params: z.object({
        token: z.string().min(1, 'Token jest wymagany'),
    }),
    body: z.object({
        items: z
            .array(
                z.object({
                    id: z.string().min(1, 'ID pozycji jest wymagane'),
                    isSelected: z.boolean(),
                    quantity: z.number().positive('Ilość musi być większa od 0'),
                })
            )
            .min(1, 'Lista pozycji jest wymagana'),
        selectedVariant: z.string().max(100).optional().nullable(),
    }),
});