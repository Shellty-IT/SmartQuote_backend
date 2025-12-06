// src/validators/followups.validator.ts

import { z } from 'zod';

// Dopasowane do Prisma enum (z OTHER)
export const followUpTypeEnum = z.enum(['CALL', 'EMAIL', 'MEETING', 'TASK', 'REMINDER', 'OTHER']);
export const followUpStatusEnum = z.enum(['PENDING', 'COMPLETED', 'CANCELLED', 'OVERDUE']);
export const priorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

// Bazowy schemat dla body
const createFollowUpBodySchema = z.object({
    title: z
        .string()
        .min(1, 'Tytuł jest wymagany')
        .max(200, 'Tytuł może mieć maksymalnie 200 znaków'),
    description: z
        .string()
        .max(2000, 'Opis może mieć maksymalnie 2000 znaków')
        .optional()
        .nullable(),
    type: followUpTypeEnum,
    priority: priorityEnum.optional().default('MEDIUM'),
    dueDate: z
        .string()
        .or(z.date())
        .transform((val) => new Date(val))
        .refine((date) => !isNaN(date.getTime()), 'Nieprawidłowa data'),
    notes: z
        .string()
        .max(5000, 'Notatki mogą mieć maksymalnie 5000 znaków')
        .optional()
        .nullable(),
    clientId: z.string().cuid('Nieprawidłowy ID klienta').optional().nullable(),
    offerId: z.string().cuid('Nieprawidłowy ID oferty').optional().nullable(),
    contractId: z.string().cuid('Nieprawidłowy ID umowy').optional().nullable(),
});

const updateFollowUpBodySchema = z.object({
    title: z
        .string()
        .min(1, 'Tytuł jest wymagany')
        .max(200, 'Tytuł może mieć maksymalnie 200 znaków')
        .optional(),
    description: z
        .string()
        .max(2000, 'Opis może mieć maksymalnie 2000 znaków')
        .optional()
        .nullable(),
    type: followUpTypeEnum.optional(),
    status: followUpStatusEnum.optional(),
    priority: priorityEnum.optional(),
    dueDate: z
        .string()
        .or(z.date())
        .transform((val) => new Date(val))
        .refine((date) => !isNaN(date.getTime()), 'Nieprawidłowa data')
        .optional(),
    notes: z
        .string()
        .max(5000, 'Notatki mogą mieć maksymalnie 5000 znaków')
        .optional()
        .nullable(),
    clientId: z.string().cuid('Nieprawidłowy ID klienta').optional().nullable(),
    offerId: z.string().cuid('Nieprawidłowy ID oferty').optional().nullable(),
    contractId: z.string().cuid('Nieprawidłowy ID umowy').optional().nullable(),
});

const updateStatusBodySchema = z.object({
    status: followUpStatusEnum,
    notes: z.string().max(5000).optional(),
});

// Schematy opakowane dla middleware validate
export const createFollowUpSchema = z.object({
    body: createFollowUpBodySchema,
    query: z.object({}).optional(),
    params: z.object({}).optional(),
});

export const updateFollowUpSchema = z.object({
    body: updateFollowUpBodySchema,
    query: z.object({}).optional(),
    params: z.object({ id: z.string() }).optional(),
});

export const updateStatusSchema = z.object({
    body: updateStatusBodySchema,
    query: z.object({}).optional(),
    params: z.object({ id: z.string() }).optional(),
});

export const followUpQuerySchema = z.object({
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(10),
    search: z.string().optional(),
    status: followUpStatusEnum.optional(),
    type: followUpTypeEnum.optional(),
    priority: priorityEnum.optional(),
    clientId: z.string().cuid().optional(),
    offerId: z.string().cuid().optional(),
    contractId: z.string().cuid().optional(),
    dateFrom: z
        .string()
        .transform((val) => new Date(val))
        .optional(),
    dateTo: z
        .string()
        .transform((val) => new Date(val))
        .optional(),
    sortBy: z
        .enum(['dueDate', 'createdAt', 'priority', 'status', 'title'])
        .optional()
        .default('dueDate'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
    overdue: z.coerce.boolean().optional(),
    upcoming: z.coerce.number().min(1).max(30).optional(),
});

// Typy eksportowane - używaj bazowych schematów dla body
export type CreateFollowUpInput = z.infer<typeof createFollowUpBodySchema>;
export type UpdateFollowUpInput = z.infer<typeof updateFollowUpBodySchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusBodySchema>;
export type FollowUpQueryInput = z.infer<typeof followUpQuerySchema>;