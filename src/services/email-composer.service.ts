// src/services/email-composer.service.ts
import nodemailer from 'nodemailer';
import { getDecryptedSmtpConfig } from './settings.service';
import { pdfService } from './pdf/index';
import { mapToPDFUser, mapToPDFClient } from './pdf/data-mapper';
import { emailComposerRepository } from '../repositories/email-composer.repository';
import { offersRepository } from '../repositories/offers.repository';
import { contractsRepository } from '../repositories/contracts.repository';
import { NotFoundError, ValidationError } from '../errors/domain.errors';
import type {
    SendEmailInput,
    UpdateDraftInput,
    EmailAttachment,
    CreateEmailTemplateInput,
    UpdateEmailTemplateInput,
    GetEmailLogsParams,
    EmailLogStatus,
} from '../types';

interface AttachmentBuffer {
    filename: string;
    content: Buffer;
    contentType: string;
}

interface UserForPDF {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    companyInfo: {
        name: string | null;
        nip: string | null;
        address: string | null;
        city: string | null;
        postalCode: string | null;
        phone: string | null;
        email: string | null;
        website?: string | null;
        logo?: string | null;
    } | null;
}

type SmtpConfig = Awaited<ReturnType<typeof getDecryptedSmtpConfig>> & {};

function createTransporter(config: NonNullable<SmtpConfig>) {
    return nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: { user: config.user, pass: config.pass },
    });
}

function buildHtmlBody(body: string): string {
    return `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
<tr><td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" role="presentation"
  style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
<tr><td style="background:linear-gradient(135deg,#0891b2,#3b82f6);padding:28px 32px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">SmartQuote AI</h1>
</td></tr>
<tr><td style="padding:32px 32px 24px;">
<div style="color:#334155;font-size:14px;line-height:1.7;">${body.replace(/\n/g, '<br/>')}</div>
</td></tr>
<tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
<p style="margin:0;color:#94a3b8;font-size:12px;">SmartQuote AI — Inteligentne zarządzanie ofertami</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function appendLinksToBody(body: string, linkLines: string[]): string {
    if (linkLines.length === 0) return body;
    return `${body}\n\n---\n${linkLines.join('\n')}`;
}

async function getSmtpOrThrow(userId: string): Promise<NonNullable<SmtpConfig>> {
    const config = await getDecryptedSmtpConfig(userId);
    if (!config) throw new ValidationError('Skonfiguruj skrzynkę pocztową w ustawieniach SMTP');
    return config;
}

async function generateOfferPDFBuffer(
    offerId: string,
    userId: string,
    frontendUrl: string,
): Promise<AttachmentBuffer> {
    void frontendUrl;
    const offer = await offersRepository.findByIdForPDFAttachment(offerId, userId);
    if (!offer) throw new NotFoundError('Oferta');

    const userForPDF: UserForPDF = {
        id: offer.user.id,
        email: offer.user.email,
        name: offer.user.name,
        phone: offer.user.phone,
        companyInfo: offer.user.companyInfo,
    };

    const pdfBuffer = await pdfService.generateOfferPDF({
        ...offer,
        user: mapToPDFUser(userForPDF),
        client: mapToPDFClient(offer.client),
        acceptanceLog: null,
    } as Parameters<typeof pdfService.generateOfferPDF>[0]);

    return {
        filename: `Oferta_${offer.number.replace(/\//g, '-')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
    };
}

async function generateContractPDFBuffer(
    contractId: string,
    userId: string,
): Promise<AttachmentBuffer> {
    const contract = await contractsRepository.findByIdForPDFAttachment(contractId, userId);
    if (!contract) throw new NotFoundError('Kontrakt');

    const userForPDF: UserForPDF = {
        id: contract.user.id,
        email: contract.user.email,
        name: contract.user.name,
        phone: contract.user.phone,
        companyInfo: contract.user.companyInfo,
    };

    const pdfBuffer = await pdfService.generateContractPDF({
        ...contract,
        user: mapToPDFUser(userForPDF),
        client: mapToPDFClient(contract.client),
        signatureLog: undefined,
    } as Parameters<typeof pdfService.generateContractPDF>[0]);

    return {
        filename: `Umowa_${contract.number.replace(/\//g, '-')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
    };
}

async function resolveAttachments(
    attachments: EmailAttachment[],
    userId: string,
    frontendUrl: string,
): Promise<{
    nodemailerAttachments: nodemailer.SendMailOptions['attachments'];
    linkLines: string[];
}> {
    const nodemailerAttachments: nodemailer.SendMailOptions['attachments'] = [];
    const linkLines: string[] = [];

    for (const att of attachments) {
        if (att.type === 'offer_pdf') {
            const buf = await generateOfferPDFBuffer(att.resourceId, userId, frontendUrl);
            nodemailerAttachments.push({
                filename: buf.filename,
                content: buf.content,
                contentType: buf.contentType,
            });
        } else if (att.type === 'contract_pdf') {
            const buf = await generateContractPDFBuffer(att.resourceId, userId);
            nodemailerAttachments.push({
                filename: buf.filename,
                content: buf.content,
                contentType: buf.contentType,
            });
        } else if (att.type === 'offer_link') {
            const offer = await emailComposerRepository.findOfferPublicToken(att.resourceId, userId);
            if (offer?.publicToken) {
                linkLines.push(`Oferta ${offer.number}: ${frontendUrl}/offer/view/${offer.publicToken}`);
            }
        } else if (att.type === 'contract_link') {
            const contract = await emailComposerRepository.findContractPublicToken(att.resourceId, userId);
            if (contract?.publicToken) {
                linkLines.push(`Umowa ${contract.number}: ${frontendUrl}/contract/view/${contract.publicToken}`);
            }
        }
    }

    return { nodemailerAttachments, linkLines };
}

class EmailComposerService {
    private readonly frontendUrl: string;

    constructor() {
        this.frontendUrl = (process.env.FRONTEND_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    }

    async sendEmail(userId: string, input: SendEmailInput): Promise<{ id: string; status: EmailLogStatus }> {
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
            return { id: log.id, status: 'DRAFT' };
        }

        const smtpConfig = await getSmtpOrThrow(userId);
        const attachments = input.attachments ?? [];

        const { nodemailerAttachments, linkLines } = await resolveAttachments(
            attachments,
            userId,
            this.frontendUrl,
        );
        const finalBody = appendLinksToBody(input.body, linkLines);
        const htmlBody = buildHtmlBody(finalBody);

        let status: EmailLogStatus = 'SENT';
        let errorMessage: string | undefined;

        try {
            const transporter = createTransporter(smtpConfig);
            await transporter.sendMail({
                from: smtpConfig.from || smtpConfig.user,
                to: input.toName ? `"${input.toName}" <${input.to}>` : input.to,
                subject: input.subject,
                html: htmlBody,
                text: finalBody,
                attachments: nodemailerAttachments,
            });
        } catch (err: unknown) {
            status = 'FAILED';
            errorMessage = err instanceof Error ? err.message : 'Nieznany błąd SMTP';
        }

        const log = await emailComposerRepository.createLog({
            userId,
            to: input.to,
            toName: input.toName,
            subject: input.subject,
            body: input.body,
            status,
            errorMessage,
            attachments,
            clientId: input.clientId,
            offerId: input.offerId,
            contractId: input.contractId,
            templateId: input.templateId,
            templateName: input.templateName,
        });

        return { id: log.id, status };
    }

    async sendDraft(userId: string, draftId: string): Promise<{ id: string; status: EmailLogStatus }> {
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

        let newStatus: EmailLogStatus = 'SENT';
        let errorMessage: string | undefined;

        try {
            const transporter = createTransporter(smtpConfig);
            await transporter.sendMail({
                from: smtpConfig.from || smtpConfig.user,
                to: draft.toName ? `"${draft.toName}" <${draft.to}>` : draft.to,
                subject: draft.subject,
                html: htmlBody,
                text: finalBody,
                attachments: nodemailerAttachments,
            });
        } catch (err: unknown) {
            newStatus = 'FAILED';
            errorMessage = err instanceof Error ? err.message : 'Nieznany błąd SMTP';
        }

        const updated = await emailComposerRepository.updateLog(draftId, {
            status: newStatus,
            errorMessage,
            sentAt: newStatus === 'SENT' ? new Date() : undefined,
        });

        return { id: updated.id, status: newStatus };
    }

    async updateDraft(
        userId: string,
        draftId: string,
        input: UpdateDraftInput,
    ): Promise<{ id: string }> {
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