"use strict";
// src/validators/followups.validator.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.followUpQuerySchema = exports.updateStatusSchema = exports.updateFollowUpSchema = exports.createFollowUpSchema = exports.priorityEnum = exports.followUpStatusEnum = exports.followUpTypeEnum = void 0;
const zod_1 = require("zod");
// Dopasowane do Prisma enum (z OTHER)
exports.followUpTypeEnum = zod_1.z.enum(['CALL', 'EMAIL', 'MEETING', 'TASK', 'REMINDER', 'OTHER']);
exports.followUpStatusEnum = zod_1.z.enum(['PENDING', 'COMPLETED', 'CANCELLED', 'OVERDUE']);
exports.priorityEnum = zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
// Bazowy schemat dla body
const createFollowUpBodySchema = zod_1.z.object({
    title: zod_1.z
        .string()
        .min(1, 'Tytuł jest wymagany')
        .max(200, 'Tytuł może mieć maksymalnie 200 znaków'),
    description: zod_1.z
        .string()
        .max(2000, 'Opis może mieć maksymalnie 2000 znaków')
        .optional()
        .nullable(),
    type: exports.followUpTypeEnum,
    priority: exports.priorityEnum.optional().default('MEDIUM'),
    dueDate: zod_1.z
        .string()
        .or(zod_1.z.date())
        .transform((val) => new Date(val))
        .refine((date) => !isNaN(date.getTime()), 'Nieprawidłowa data'),
    notes: zod_1.z
        .string()
        .max(5000, 'Notatki mogą mieć maksymalnie 5000 znaków')
        .optional()
        .nullable(),
    clientId: zod_1.z.string().cuid('Nieprawidłowy ID klienta').optional().nullable(),
    offerId: zod_1.z.string().cuid('Nieprawidłowy ID oferty').optional().nullable(),
    contractId: zod_1.z.string().cuid('Nieprawidłowy ID umowy').optional().nullable(),
});
const updateFollowUpBodySchema = zod_1.z.object({
    title: zod_1.z
        .string()
        .min(1, 'Tytuł jest wymagany')
        .max(200, 'Tytuł może mieć maksymalnie 200 znaków')
        .optional(),
    description: zod_1.z
        .string()
        .max(2000, 'Opis może mieć maksymalnie 2000 znaków')
        .optional()
        .nullable(),
    type: exports.followUpTypeEnum.optional(),
    status: exports.followUpStatusEnum.optional(),
    priority: exports.priorityEnum.optional(),
    dueDate: zod_1.z
        .string()
        .or(zod_1.z.date())
        .transform((val) => new Date(val))
        .refine((date) => !isNaN(date.getTime()), 'Nieprawidłowa data')
        .optional(),
    notes: zod_1.z
        .string()
        .max(5000, 'Notatki mogą mieć maksymalnie 5000 znaków')
        .optional()
        .nullable(),
    clientId: zod_1.z.string().cuid('Nieprawidłowy ID klienta').optional().nullable(),
    offerId: zod_1.z.string().cuid('Nieprawidłowy ID oferty').optional().nullable(),
    contractId: zod_1.z.string().cuid('Nieprawidłowy ID umowy').optional().nullable(),
});
const updateStatusBodySchema = zod_1.z.object({
    status: exports.followUpStatusEnum,
    notes: zod_1.z.string().max(5000).optional(),
});
// Schematy opakowane dla middleware validate
exports.createFollowUpSchema = zod_1.z.object({
    body: createFollowUpBodySchema,
    query: zod_1.z.object({}).optional(),
    params: zod_1.z.object({}).optional(),
});
exports.updateFollowUpSchema = zod_1.z.object({
    body: updateFollowUpBodySchema,
    query: zod_1.z.object({}).optional(),
    params: zod_1.z.object({ id: zod_1.z.string() }).optional(),
});
exports.updateStatusSchema = zod_1.z.object({
    body: updateStatusBodySchema,
    query: zod_1.z.object({}).optional(),
    params: zod_1.z.object({ id: zod_1.z.string() }).optional(),
});
exports.followUpQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().min(1).optional().default(1),
    limit: zod_1.z.coerce.number().min(1).max(100).optional().default(10),
    search: zod_1.z.string().optional(),
    status: exports.followUpStatusEnum.optional(),
    type: exports.followUpTypeEnum.optional(),
    priority: exports.priorityEnum.optional(),
    clientId: zod_1.z.string().cuid().optional(),
    offerId: zod_1.z.string().cuid().optional(),
    contractId: zod_1.z.string().cuid().optional(),
    dateFrom: zod_1.z
        .string()
        .transform((val) => new Date(val))
        .optional(),
    dateTo: zod_1.z
        .string()
        .transform((val) => new Date(val))
        .optional(),
    sortBy: zod_1.z
        .enum(['dueDate', 'createdAt', 'priority', 'status', 'title'])
        .optional()
        .default('dueDate'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('asc'),
    overdue: zod_1.z.coerce.boolean().optional(),
    upcoming: zod_1.z.coerce.number().min(1).max(30).optional(),
});
