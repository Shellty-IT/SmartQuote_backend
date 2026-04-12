// src/validators/email-composer.validator.ts

import { z } from 'zod';

const emailAttachmentSchema = z.object({
    type: z.enum(['offer_pdf', 'contract_pdf', 'offer_link', 'contract_link']),
    resourceId: z.string().min(1),
    name: z.string().min(1),
});

export const sendEmailSchema = z.object({
    to: z.string().email('Nieprawidłowy adres email'),
    toName: z.string().max(100).optional(),
    subject: z.string().min(1, 'Temat jest wymagany').max(200),
    body: z.string().min(1, 'Treść wiadomości jest wymagana'),
    clientId: z.string().optional(),
    offerId: z.string().optional(),
    contractId: z.string().optional(),
    templateId: z.string().optional(),
    templateName: z.string().optional(),
    attachments: z.array(emailAttachmentSchema).max(10).optional().default([]),
    saveAsDraft: z.boolean().optional().default(false),
});

export const updateDraftSchema = z.object({
    to: z.string().email().optional(),
    toName: z.string().max(100).optional(),
    subject: z.string().min(1).max(200).optional(),
    body: z.string().min(1).optional(),
    clientId: z.string().optional().nullable(),
    offerId: z.string().optional().nullable(),
    contractId: z.string().optional().nullable(),
    templateId: z.string().optional().nullable(),
    templateName: z.string().optional().nullable(),
    attachments: z.array(emailAttachmentSchema).max(10).optional(),
});

export const createTemplateSchema = z.object({
    name: z.string().min(1, 'Nazwa szablonu jest wymagana').max(100),
    subject: z.string().min(1, 'Temat jest wymagany').max(200),
    body: z.string().min(1, 'Treść szablonu jest wymagana'),
});

export const updateTemplateSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    subject: z.string().min(1).max(200).optional(),
    body: z.string().min(1).optional(),
});

export const getEmailLogsSchema = z.object({
    page: z.string().optional().transform(v => v ? parseInt(v) : 1),
    limit: z.string().optional().transform(v => v ? Math.min(parseInt(v), 50) : 20),
    status: z.enum(['SENT', 'FAILED', 'DRAFT']).optional(),
    clientId: z.string().optional(),
    offerId: z.string().optional(),
    contractId: z.string().optional(),
    search: z.string().optional(),
});