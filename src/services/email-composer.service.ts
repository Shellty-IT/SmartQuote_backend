// src/services/email-composer.service.ts
import { getEffectiveSmtpConfig } from './settings.service';
import { emailComposerRepository } from '../repositories/email-composer.repository';
import { NotFoundError, ValidationError } from '../errors/domain.errors';
import { createModuleLogger } from '../lib/logger';
import { config } from '../config';
import { resolveAttachments } from './email/email-attachment-resolver';
import {
    sendEmail,
    buildHtmlBody,
    htmlToPlainText,
    appendLinksToBody,
    type SmtpConfig,
} from './email/email-transport';
import type {
    SendEmailInput,
    UpdateDraftInput,
    EmailAttachment,
    CreateEmailTemplateInput,
    UpdateEmailTemplateInput,
    GetEmailLogsParams,
    EmailLogStatus,
} from '../types';

const logger = createModuleLogger('email-composer');

interface SendResult {
    id: string;
    status: EmailLogStatus;
    errorMessage?: string;
}

async function getSmtpOrThrow(userId: string): Promise<NonNullable<SmtpConfig>> {
    const cfg = await getEffectiveSmtpConfig(userId);
    if (!cfg) throw new ValidationError('Skonfiguruj skrzynkę pocztową w ustawieniach SMTP');
    return cfg;
}

class EmailComposerService {
    private readonly frontendUrl: string;

    constructor() {
        this.frontendUrl = config.frontendUrl.replace(/\/$/, '');
    }

    async sendEmail(userId: string, input: SendEmailInput): Promise<SendResult> {
        if (input.saveAsDraft) {
            const log = await emailComposerRepository.createLog({
                userId,
                to: input.to,
                toName: input.toName,
                subject: input.subject,
                body: input.body,
                status: 'DRAFT',
                attachments: input.attachments ?? [],
                clientId: input.clientId,
                offerId: input.offerId,
                contractId: input.contractId,
                templateId: input.templateId,
                templateName: input.templateName,
            });
            logger.info({ userId, to: input.to }, 'Email saved as draft');
            return { id: log.id, status: 'DRAFT' };
        }

        const smtpConfig = await getSmtpOrThrow(userId);
        const { nodemailerAttachments, linkLines } = await resolveAttachments(
            input.attachments ?? [],
            userId,
            this.frontendUrl,
        );
        const finalBody = appendLinksToBody(input.body, linkLines);
        const htmlBody = buildHtmlBody(finalBody);

        const { status, errorMessage } = await sendEmail(
            {
                from: smtpConfig.from,
                to: input.toName ? `"${input.toName}" <${input.to}>` : input.to,
                subject: input.subject,
                html: htmlBody,
                text: htmlToPlainText(finalBody),
                attachments: nodemailerAttachments,
            },
            smtpConfig,
        );

        const log = await emailComposerRepository.createLog({
            userId,
            to: input.to,
            toName: input.toName,
            subject: input.subject,
            body: input.body,
            status,
            errorMessage,
            attachments: input.attachments ?? [],
            clientId: input.clientId,
            offerId: input.offerId,
            contractId: input.contractId,
            templateId: input.templateId,
            templateName: input.templateName,
        });

        return { id: log.id, status, errorMessage };
    }

    async sendDraft(userId: string, draftId: string): Promise<SendResult> {
        const draft = await emailComposerRepository.findDraftById(draftId, userId);
        if (!draft) throw new NotFoundError('Szkic');

        const smtpConfig = await getSmtpOrThrow(userId);
        const attachments = (draft.attachments as unknown as EmailAttachment[]) ?? [];
        const { nodemailerAttachments, linkLines } = await resolveAttachments(
            attachments,
            userId,
            this.frontendUrl,
        );
        const finalBody = appendLinksToBody(draft.body, linkLines);
        const htmlBody = buildHtmlBody(finalBody);

        const { status, errorMessage } = await sendEmail(
            {
                from: smtpConfig.from,
                to: draft.toName ? `"${draft.toName}" <${draft.to}>` : draft.to,
                subject: draft.subject,
                html: htmlBody,
                text: htmlToPlainText(finalBody),
                attachments: nodemailerAttachments,
            },
            smtpConfig,
        );

        const updated = await emailComposerRepository.updateLog(draftId, {
            status,
            errorMessage,
            sentAt: status === 'SENT' ? new Date() : undefined,
        });

        logger.info({ userId, draftId, status }, 'Draft sent');
        return { id: updated.id, status, errorMessage };
    }

    async updateDraft(userId: string, draftId: string, input: UpdateDraftInput): Promise<{ id: string }> {
        const draft = await emailComposerRepository.findDraftById(draftId, userId);
        if (!draft) throw new NotFoundError('Szkic');

        const updated = await emailComposerRepository.updateLog(draftId, {
            to: input.to,
            toName: input.toName,
            subject: input.subject,
            body: input.body,
            clientId: input.clientId,
            offerId: input.offerId,
            contractId: input.contractId,
            templateId: input.templateId,
            templateName: input.templateName,
            attachments: input.attachments,
        });

        return { id: updated.id };
    }

    async deleteEmailLog(userId: string, logId: string): Promise<void> {
        const log = await emailComposerRepository.findLogById(logId, userId);
        if (!log) throw new NotFoundError('Wiadomość');
        await emailComposerRepository.deleteLog(logId);
    }

    async getEmailLogs(params: GetEmailLogsParams) {
        const result = await emailComposerRepository.findLogs(params);
        return {
            items: result.items,
            meta: {
                page: result.page,
                limit: result.limit,
                total: result.total,
                totalPages: Math.ceil(result.total / result.limit),
            },
        };
    }

    async getEmailLogById(userId: string, logId: string) {
        const log = await emailComposerRepository.findLogById(logId, userId);
        if (!log) throw new NotFoundError('Wiadomość');
        return log;
    }

    async createTemplate(userId: string, input: CreateEmailTemplateInput) {
        return emailComposerRepository.createTemplate(userId, input);
    }

    async updateTemplate(userId: string, templateId: string, input: UpdateEmailTemplateInput) {
        const template = await emailComposerRepository.findTemplateById(templateId, userId);
        if (!template) throw new NotFoundError('Szablon');
        if (template.isBuiltIn) throw new ValidationError('Nie można edytować wbudowanego szablonu');
        return emailComposerRepository.updateTemplate(templateId, input);
    }

    async deleteTemplate(userId: string, templateId: string): Promise<void> {
        const template = await emailComposerRepository.findTemplateById(templateId, userId);
        if (!template) throw new NotFoundError('Szablon');
        if (template.isBuiltIn) throw new ValidationError('Nie można usunąć wbudowanego szablonu');
        await emailComposerRepository.deleteTemplate(templateId);
    }

    async getTemplates(userId: string) {
        return emailComposerRepository.findTemplates(userId);
    }

    async getTemplateById(userId: string, templateId: string) {
        const template = await emailComposerRepository.findTemplateById(templateId, userId);
        if (!template) throw new NotFoundError('Szablon');
        return template;
    }
}

export const emailComposerService = new EmailComposerService();