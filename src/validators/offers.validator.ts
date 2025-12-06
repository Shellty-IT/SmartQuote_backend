// backend/src/validators/offers.validator.ts

import { z } from 'zod';

const offerStatusEnum = z.enum([
    'DRAFT',
    'SENT',
    'VIEWED',
    'NEGOTIATION',
    'ACCEPTED',
    'REJECTED',
    'EXPIRED',
]);

const offerItemSchema = z.object({
    name: z.string().min(1, 'Nazwa pozycji jest wymagana').max(300),
    description: z.string().max(1000).optional().nullable(),
    quantity: z.number().positive('Ilość musi być większa od 0'),
    unit: z.string().max(20).optional().default('szt.'),
    unitPrice: z.number().nonnegative('Cena nie może być ujemna'),
    vatRate: z.number().min(0).max(100).optional().default(23),
    discount: z.number().min(0).max(100).optional().default(0),
});

// Funkcja do walidacji daty - akceptuje różne formaty
const dateSchema = z.string()
    .refine((val) => {
        if (!val) return true;
        // Akceptuj format YYYY-MM-DD lub pełny ISO
        const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
        return dateRegex.test(val);
    }, 'Nieprawidłowy format daty')
    .transform((val) => {
        if (!val) return null;
        // Jeśli to tylko data (YYYY-MM-DD), dodaj czas
        if (val.length === 10) {
            return `${val}T23:59:59.000Z`;
        }
        return val;
    })
    .optional()
    .nullable();

export const createOfferSchema = z.object({
    body: z.object({
        clientId: z.string().min(1, 'ID klienta jest wymagane'),
        title: z.string().min(3, 'Tytuł musi mieć minimum 3 znaki').max(300),
        description: z.string().max(5000).optional().nullable(),
        validUntil: dateSchema,
        notes: z.string().max(2000).optional().nullable(),
        terms: z.string().max(2000).optional().nullable(),
        paymentDays: z.number().int().min(0).max(365).optional().default(14),
        items: z.array(offerItemSchema).min(1, 'Oferta musi zawierać przynajmniej jedną pozycję'),
    }),
});

export const updateOfferSchema = z.object({
    params: z.object({
        id: z.string().min(1, 'ID jest wymagane'),
    }),
    body: z.object({
        clientId: z.string().optional(),
        title: z.string().min(3).max(300).optional(),
        description: z.string().max(5000).optional().nullable(),
        status: offerStatusEnum.optional(),
        validUntil: dateSchema,
        notes: z.string().max(2000).optional().nullable(),
        terms: z.string().max(2000).optional().nullable(),
        paymentDays: z.number().int().min(0).max(365).optional(),
        items: z.array(offerItemSchema).optional(),
    }),
});

export const getOfferSchema = z.object({
    params: z.object({
        id: z.string().min(1, 'ID jest wymagane'),
    }),
});

export const listOffersSchema = z.object({
    query: z.object({
        page: z.string().optional().default('1'),
        limit: z.string().optional().default('20'),
        search: z.string().optional(),
        status: offerStatusEnum.optional(),
        clientId: z.string().optional(),
        sortBy: z.enum(['number', 'title', 'totalGross', 'createdAt', 'validUntil']).optional().default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
        dateFrom: dateSchema,
        dateTo: dateSchema,
    }),
});