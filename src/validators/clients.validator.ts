import { z } from 'zod';

const clientTypeEnum = z.enum(['PERSON', 'COMPANY']);

export const createClientSchema = z.object({
    body: z.object({
        type: clientTypeEnum.optional().default('COMPANY'),
        name: z.string().min(2, 'Nazwa musi mieć minimum 2 znaki').max(200),
        email: z.string().email('Nieprawidłowy email').optional().nullable(),
        phone: z.string().max(20).optional().nullable(),
        company: z.string().max(200).optional().nullable(),
        nip: z
            .string()
            .regex(/^\d{10}$/, 'NIP musi mieć 10 cyfr')
            .optional()
            .nullable(),
        regon: z.string().max(14).optional().nullable(),
        address: z.string().max(300).optional().nullable(),
        city: z.string().max(100).optional().nullable(),
        postalCode: z.string().max(10).optional().nullable(),
        country: z.string().max(100).optional().default('Polska'),
        website: z.string().url('Nieprawidłowy URL').optional().nullable(),
        notes: z.string().max(2000).optional().nullable(),
    }),
});

export const updateClientSchema = z.object({
    params: z.object({
        id: z.string().min(1, 'ID jest wymagane'),
    }),
    body: z.object({
        type: clientTypeEnum.optional(),
        name: z.string().min(2).max(200).optional(),
        email: z.string().email().optional().nullable(),
        phone: z.string().max(20).optional().nullable(),
        company: z.string().max(200).optional().nullable(),
        nip: z.string().regex(/^\d{10}$/).optional().nullable(),
        regon: z.string().max(14).optional().nullable(),
        address: z.string().max(300).optional().nullable(),
        city: z.string().max(100).optional().nullable(),
        postalCode: z.string().max(10).optional().nullable(),
        country: z.string().max(100).optional(),
        website: z.string().url().optional().nullable(),
        notes: z.string().max(2000).optional().nullable(),
        isActive: z.boolean().optional(),
    }),
});

export const getClientSchema = z.object({
    params: z.object({
        id: z.string().min(1, 'ID jest wymagane'),
    }),
});

export const listClientsSchema = z.object({
    query: z.object({
        page: z.string().optional().default('1'),
        limit: z.string().optional().default('20'),
        search: z.string().optional(),
        type: clientTypeEnum.optional(),
        sortBy: z.enum(['name', 'createdAt', 'updatedAt']).optional().default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
        isActive: z.string().optional(),
    }),
});