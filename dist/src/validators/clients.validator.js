"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listClientsSchema = exports.getClientSchema = exports.updateClientSchema = exports.createClientSchema = void 0;
const zod_1 = require("zod");
const clientTypeEnum = zod_1.z.enum(['PERSON', 'COMPANY']);
exports.createClientSchema = zod_1.z.object({
    body: zod_1.z.object({
        type: clientTypeEnum.optional().default('COMPANY'),
        name: zod_1.z.string().min(2, 'Nazwa musi mieć minimum 2 znaki').max(200),
        email: zod_1.z.string().email('Nieprawidłowy email').optional().nullable(),
        phone: zod_1.z.string().max(20).optional().nullable(),
        company: zod_1.z.string().max(200).optional().nullable(),
        nip: zod_1.z
            .string()
            .regex(/^\d{10}$/, 'NIP musi mieć 10 cyfr')
            .optional()
            .nullable(),
        regon: zod_1.z.string().max(14).optional().nullable(),
        address: zod_1.z.string().max(300).optional().nullable(),
        city: zod_1.z.string().max(100).optional().nullable(),
        postalCode: zod_1.z.string().max(10).optional().nullable(),
        country: zod_1.z.string().max(100).optional().default('Polska'),
        website: zod_1.z.string().url('Nieprawidłowy URL').optional().nullable(),
        notes: zod_1.z.string().max(2000).optional().nullable(),
    }),
});
exports.updateClientSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'ID jest wymagane'),
    }),
    body: zod_1.z.object({
        type: clientTypeEnum.optional(),
        name: zod_1.z.string().min(2).max(200).optional(),
        email: zod_1.z.string().email().optional().nullable(),
        phone: zod_1.z.string().max(20).optional().nullable(),
        company: zod_1.z.string().max(200).optional().nullable(),
        nip: zod_1.z.string().regex(/^\d{10}$/).optional().nullable(),
        regon: zod_1.z.string().max(14).optional().nullable(),
        address: zod_1.z.string().max(300).optional().nullable(),
        city: zod_1.z.string().max(100).optional().nullable(),
        postalCode: zod_1.z.string().max(10).optional().nullable(),
        country: zod_1.z.string().max(100).optional(),
        website: zod_1.z.string().url().optional().nullable(),
        notes: zod_1.z.string().max(2000).optional().nullable(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
exports.getClientSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'ID jest wymagane'),
    }),
});
exports.listClientsSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().optional().default('1'),
        limit: zod_1.z.string().optional().default('20'),
        search: zod_1.z.string().optional(),
        type: clientTypeEnum.optional(),
        sortBy: zod_1.z.enum(['name', 'createdAt', 'updatedAt']).optional().default('createdAt'),
        sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
        isActive: zod_1.z.string().optional(),
    }),
});
