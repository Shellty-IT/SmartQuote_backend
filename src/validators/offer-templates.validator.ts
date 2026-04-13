// src/validators/offer-templates.validator.ts

import { z } from 'zod';

const offerTemplateItemSchema = z.object({
    name: z.string().min(1, 'Nazwa pozycji jest wymagana').max(200),
    description: z.string().max(500).optional().nullable(),
    quantity: z.number().positive('Ilość musi być większa od 0'),
    unit: z.string().max(20).optional().default('szt.'),
    unitPrice: z.number().min(0, 'Cena nie może być ujemna'),
    vatRate: z.number().min(0).max(100).optional().default(23),
    discount: z.number().min(0).max(100).optional().default(0),
    isOptional: z.boolean().optional().default(false),
    variantName: z.string().max(100).optional().nullable(),
});

export const createOfferTemplateSchema = z.object({
    name: z.string().min(1, 'Nazwa szablonu jest wymagana').max(100),
    description: z.string().max(500).optional().nullable(),
    category: z.string().max(100).optional().nullable(),
    defaultPaymentDays: z.number().int().min(1).max(365).optional().default(14),
    defaultTerms: z.string().max(2000).optional().nullable(),
    defaultNotes: z.string().max(2000).optional().nullable(),
    items: z.array(offerTemplateItemSchema).min(1, 'Szablon musi mieć co najmniej jedną pozycję').max(50),
});

export const updateOfferTemplateSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional().nullable(),
    category: z.string().max(100).optional().nullable(),
    defaultPaymentDays: z.number().int().min(1).max(365).optional(),
    defaultTerms: z.string().max(2000).optional().nullable(),
    defaultNotes: z.string().max(2000).optional().nullable(),
    items: z.array(offerTemplateItemSchema).min(1).max(50).optional(),
});

export const getOfferTemplatesSchema = z.object({
    page: z.string().optional().transform((v) => (v ? parseInt(v) : 1)),
    limit: z.string().optional().transform((v) => (v ? Math.min(parseInt(v), 50) : 20)),
    search: z.string().optional(),
    category: z.string().optional(),
});