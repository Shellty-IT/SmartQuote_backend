"use strict";
// smartquote_backend/src/validators/settings.validator.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.testSmtpConnectionSchema = exports.updateSmtpConfigSchema = exports.createApiKeySchema = exports.updateCompanyInfoSchema = exports.updateSettingsSchema = exports.changePasswordSchema = exports.updateProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(2, 'Imię musi mieć min. 2 znaki').max(100).optional(),
        phone: zod_1.z.string().max(20).optional().nullable(),
        avatar: zod_1.z.string().url('Nieprawidłowy URL').optional().nullable(),
    }),
});
exports.changePasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        currentPassword: zod_1.z.string().min(1, 'Podaj obecne hasło'),
        newPassword: zod_1.z
            .string()
            .min(8, 'Hasło musi mieć min. 8 znaków')
            .regex(/[A-Z]/, 'Hasło musi zawierać wielką literę')
            .regex(/[a-z]/, 'Hasło musi zawierać małą literę')
            .regex(/[0-9]/, 'Hasło musi zawierać cyfrę'),
    }),
});
exports.updateSettingsSchema = zod_1.z.object({
    body: zod_1.z.object({
        theme: zod_1.z.enum(['light', 'dark', 'system']).optional(),
        language: zod_1.z.enum(['pl', 'en']).optional(),
        emailNotifications: zod_1.z.boolean().optional(),
        offerNotifications: zod_1.z.boolean().optional(),
        followUpReminders: zod_1.z.boolean().optional(),
        weeklyReport: zod_1.z.boolean().optional(),
        aiTone: zod_1.z.enum(['professional', 'friendly', 'formal']).optional(),
        aiAutoSuggestions: zod_1.z.boolean().optional(),
    }),
});
exports.updateCompanyInfoSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().max(200).optional().nullable(),
        nip: zod_1.z.string().max(20).optional().nullable(),
        regon: zod_1.z.string().max(20).optional().nullable(),
        address: zod_1.z.string().max(200).optional().nullable(),
        city: zod_1.z.string().max(100).optional().nullable(),
        postalCode: zod_1.z.string().max(10).optional().nullable(),
        country: zod_1.z.string().max(100).optional().nullable(),
        phone: zod_1.z.string().max(20).optional().nullable(),
        email: zod_1.z.string().email('Nieprawidłowy email').optional().nullable(),
        website: zod_1.z.string().url('Nieprawidłowy URL').optional().nullable(),
        bankName: zod_1.z.string().max(100).optional().nullable(),
        bankAccount: zod_1.z.string().max(50).optional().nullable(),
        logo: zod_1.z.string().url('Nieprawidłowy URL').optional().nullable(),
        defaultPaymentDays: zod_1.z.number().int().min(0).max(365).optional(),
        defaultTerms: zod_1.z.string().max(5000).optional().nullable(),
        defaultNotes: zod_1.z.string().max(2000).optional().nullable(),
    }),
});
exports.createApiKeySchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Nazwa jest wymagana').max(100),
        permissions: zod_1.z.array(zod_1.z.enum(['read', 'write', 'delete'])).optional(),
        expiresAt: zod_1.z.string().datetime().optional().nullable(),
    }),
});
exports.updateSmtpConfigSchema = zod_1.z.object({
    body: zod_1.z.object({
        smtpHost: zod_1.z.string().min(1, 'Host SMTP jest wymagany').max(200),
        smtpPort: zod_1.z.number().int().min(1).max(65535).default(587),
        smtpUser: zod_1.z.string().min(1, 'Użytkownik SMTP jest wymagany').max(200),
        smtpPass: zod_1.z.string().max(500).optional(),
        smtpFrom: zod_1.z.string().max(200).optional(),
    }),
});
exports.testSmtpConnectionSchema = zod_1.z.object({
    body: zod_1.z.object({
        host: zod_1.z.string().min(1, 'Host jest wymagany'),
        port: zod_1.z.number().int().min(1).max(65535),
        user: zod_1.z.string().min(1, 'Użytkownik jest wymagany'),
        pass: zod_1.z.string().min(1, 'Hasło jest wymagane'),
        from: zod_1.z.string().optional(),
    }),
});
