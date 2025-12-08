"use strict";
// backend/src/validators/offers.validator.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.listOffersSchema = exports.getOfferSchema = exports.updateOfferSchema = exports.createOfferSchema = void 0;
const zod_1 = require("zod");
const offerStatusEnum = zod_1.z.enum([
    'DRAFT',
    'SENT',
    'VIEWED',
    'NEGOTIATION',
    'ACCEPTED',
    'REJECTED',
    'EXPIRED',
]);
const offerItemSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Nazwa pozycji jest wymagana').max(300),
    description: zod_1.z.string().max(1000).optional().nullable(),
    quantity: zod_1.z.number().positive('Ilość musi być większa od 0'),
    unit: zod_1.z.string().max(20).optional().default('szt.'),
    unitPrice: zod_1.z.number().nonnegative('Cena nie może być ujemna'),
    vatRate: zod_1.z.number().min(0).max(100).optional().default(23),
    discount: zod_1.z.number().min(0).max(100).optional().default(0),
});
// Funkcja do walidacji daty - akceptuje różne formaty
const dateSchema = zod_1.z.string()
    .refine((val) => {
    if (!val)
        return true;
    // Akceptuj format YYYY-MM-DD lub pełny ISO
    const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
    return dateRegex.test(val);
}, 'Nieprawidłowy format daty')
    .transform((val) => {
    if (!val)
        return null;
    // Jeśli to tylko data (YYYY-MM-DD), dodaj czas
    if (val.length === 10) {
        return `${val}T23:59:59.000Z`;
    }
    return val;
})
    .optional()
    .nullable();
exports.createOfferSchema = zod_1.z.object({
    body: zod_1.z.object({
        clientId: zod_1.z.string().min(1, 'ID klienta jest wymagane'),
        title: zod_1.z.string().min(3, 'Tytuł musi mieć minimum 3 znaki').max(300),
        description: zod_1.z.string().max(5000).optional().nullable(),
        validUntil: dateSchema,
        notes: zod_1.z.string().max(2000).optional().nullable(),
        terms: zod_1.z.string().max(2000).optional().nullable(),
        paymentDays: zod_1.z.number().int().min(0).max(365).optional().default(14),
        items: zod_1.z.array(offerItemSchema).min(1, 'Oferta musi zawierać przynajmniej jedną pozycję'),
    }),
});
exports.updateOfferSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'ID jest wymagane'),
    }),
    body: zod_1.z.object({
        clientId: zod_1.z.string().optional(),
        title: zod_1.z.string().min(3).max(300).optional(),
        description: zod_1.z.string().max(5000).optional().nullable(),
        status: offerStatusEnum.optional(),
        validUntil: dateSchema,
        notes: zod_1.z.string().max(2000).optional().nullable(),
        terms: zod_1.z.string().max(2000).optional().nullable(),
        paymentDays: zod_1.z.number().int().min(0).max(365).optional(),
        items: zod_1.z.array(offerItemSchema).optional(),
    }),
});
exports.getOfferSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'ID jest wymagane'),
    }),
});
exports.listOffersSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().optional().default('1'),
        limit: zod_1.z.string().optional().default('20'),
        search: zod_1.z.string().optional(),
        status: offerStatusEnum.optional(),
        clientId: zod_1.z.string().optional(),
        sortBy: zod_1.z.enum(['number', 'title', 'totalGross', 'createdAt', 'validUntil']).optional().default('createdAt'),
        sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
        dateFrom: dateSchema,
        dateTo: dateSchema,
    }),
});
