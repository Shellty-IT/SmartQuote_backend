// smartquote_backend/src/validators/contracts.validator.ts

import { z } from 'zod';

const contractItemSchema = z.object({
    name: z.string().min(1, 'Nazwa pozycji jest wymagana'),
    description: z.string().optional(),
    quantity: z.number().positive('Ilość musi być większa od 0'),
    unit: z.string().optional().default('szt.'),
    unitPrice: z.number().min(0, 'Cena musi być nieujemna'),
    vatRate: z.number().min(0).max(100).optional().default(23),
    discount: z.number().min(0).max(100).optional().default(0),
    position: z.number().optional(),
});

export const createContractSchema = z.object({
    body: z.object({
        title: z.string().min(1, 'Tytuł jest wymagany'),
        description: z.string().optional(),
        clientId: z.string().min(1, 'Klient jest wymagany'),
        offerId: z.string().optional(),
        startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
        endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
        terms: z.string().optional(),
        paymentTerms: z.string().optional(),
        paymentDays: z.number().int().min(0).optional().default(14),
        notes: z.string().optional(),
        items: z.array(contractItemSchema).min(1, 'Przynajmniej jedna pozycja jest wymagana'),
    }),
});

export const updateContractSchema = z.object({
    body: z.object({
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        status: z.enum(['DRAFT', 'PENDING_SIGNATURE', 'ACTIVE', 'COMPLETED', 'TERMINATED', 'EXPIRED']).optional(),
        startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
        endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
        signedAt: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
        terms: z.string().optional(),
        paymentTerms: z.string().optional(),
        paymentDays: z.number().int().min(0).optional(),
        notes: z.string().optional(),
        items: z.array(contractItemSchema).optional(),
    }),
});

export const updateContractStatusSchema = z.object({
    body: z.object({
        status: z.enum(['DRAFT', 'PENDING_SIGNATURE', 'ACTIVE', 'COMPLETED', 'TERMINATED', 'EXPIRED']),
    }),
});