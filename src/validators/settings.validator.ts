// smartquote_backend/src/validators/settings.validator.ts

import { z } from 'zod';

export const updateProfileSchema = z.object({
    body: z.object({
        name: z.string().min(2, 'Imię musi mieć min. 2 znaki').max(100).optional(),
        phone: z.string().max(20).optional().nullable(),
        avatar: z.string().url('Nieprawidłowy URL').optional().nullable(),
    }),
});

export const changePasswordSchema = z.object({
    body: z.object({
        currentPassword: z.string().min(1, 'Podaj obecne hasło'),
        newPassword: z
            .string()
            .min(8, 'Hasło musi mieć min. 8 znaków')
            .regex(/[A-Z]/, 'Hasło musi zawierać wielką literę')
            .regex(/[a-z]/, 'Hasło musi zawierać małą literę')
            .regex(/[0-9]/, 'Hasło musi zawierać cyfrę'),
    }),
});

export const updateSettingsSchema = z.object({
    body: z.object({
        theme: z.enum(['light', 'dark', 'system']).optional(),
        language: z.enum(['pl', 'en']).optional(),
        emailNotifications: z.boolean().optional(),
        offerNotifications: z.boolean().optional(),
        followUpReminders: z.boolean().optional(),
        weeklyReport: z.boolean().optional(),
        aiTone: z.enum(['professional', 'friendly', 'formal']).optional(),
        aiAutoSuggestions: z.boolean().optional(),
    }),
});

export const updateCompanyInfoSchema = z.object({
    body: z.object({
        name: z.string().max(200).optional().nullable(),
        nip: z.string().max(20).optional().nullable(),
        regon: z.string().max(20).optional().nullable(),
        address: z.string().max(200).optional().nullable(),
        city: z.string().max(100).optional().nullable(),
        postalCode: z.string().max(10).optional().nullable(),
        country: z.string().max(100).optional().nullable(),
        phone: z.string().max(20).optional().nullable(),
        email: z.string().email('Nieprawidłowy email').optional().nullable(),
        website: z.string().url('Nieprawidłowy URL').optional().nullable(),
        bankName: z.string().max(100).optional().nullable(),
        bankAccount: z.string().max(50).optional().nullable(),
        logo: z.string().url('Nieprawidłowy URL').optional().nullable(),
        defaultPaymentDays: z.number().int().min(0).max(365).optional(),
        defaultTerms: z.string().max(5000).optional().nullable(),
        defaultNotes: z.string().max(2000).optional().nullable(),
    }),
});

export const createApiKeySchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Nazwa jest wymagana').max(100),
        permissions: z.array(z.enum(['read', 'write', 'delete'])).optional(),
        expiresAt: z.string().datetime().optional().nullable(),
    }),
});