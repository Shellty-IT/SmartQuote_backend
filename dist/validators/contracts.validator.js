"use strict";
// smartquote_backend/src/validators/contracts.validator.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateContractStatusSchema = exports.updateContractSchema = exports.createContractSchema = void 0;
const zod_1 = require("zod");
const contractItemSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Nazwa pozycji jest wymagana'),
    description: zod_1.z.string().optional(),
    quantity: zod_1.z.number().positive('Ilość musi być większa od 0'),
    unit: zod_1.z.string().optional().default('szt.'),
    unitPrice: zod_1.z.number().min(0, 'Cena musi być nieujemna'),
    vatRate: zod_1.z.number().min(0).max(100).optional().default(23),
    discount: zod_1.z.number().min(0).max(100).optional().default(0),
    position: zod_1.z.number().optional(),
});
exports.createContractSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(1, 'Tytuł jest wymagany'),
        description: zod_1.z.string().optional(),
        clientId: zod_1.z.string().min(1, 'Klient jest wymagany'),
        offerId: zod_1.z.string().optional(),
        startDate: zod_1.z.string().optional().transform(val => val ? new Date(val) : undefined),
        endDate: zod_1.z.string().optional().transform(val => val ? new Date(val) : undefined),
        terms: zod_1.z.string().optional(),
        paymentTerms: zod_1.z.string().optional(),
        paymentDays: zod_1.z.number().int().min(0).optional().default(14),
        notes: zod_1.z.string().optional(),
        items: zod_1.z.array(contractItemSchema).min(1, 'Przynajmniej jedna pozycja jest wymagana'),
    }),
});
exports.updateContractSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(1).optional(),
        description: zod_1.z.string().optional(),
        status: zod_1.z.enum(['DRAFT', 'PENDING_SIGNATURE', 'ACTIVE', 'COMPLETED', 'TERMINATED', 'EXPIRED']).optional(),
        startDate: zod_1.z.string().optional().transform(val => val ? new Date(val) : undefined),
        endDate: zod_1.z.string().optional().transform(val => val ? new Date(val) : undefined),
        signedAt: zod_1.z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
        terms: zod_1.z.string().optional(),
        paymentTerms: zod_1.z.string().optional(),
        paymentDays: zod_1.z.number().int().min(0).optional(),
        notes: zod_1.z.string().optional(),
        items: zod_1.z.array(contractItemSchema).optional(),
    }),
});
exports.updateContractStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum(['DRAFT', 'PENDING_SIGNATURE', 'ACTIVE', 'COMPLETED', 'TERMINATED', 'EXPIRED']),
    }),
});
