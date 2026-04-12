// src/services/email-composer.service.ts
import nodemailer from 'nodemailer';
import prisma from '../lib/prisma';
import { getDecryptedSmtpConfig } from './settings.service';
import { pdfService } from './pdf/index';
import { mapToPDFUser, mapToPDFClient } from './pdf/data-mapper';
import type {
    SendEmailInput,
    UpdateDraftInput,
    EmailAttachment,
    CreateEmailTemplateInput,
    UpdateEmailTemplateInput,
    GetEmailLogsParams,
    EmailLogStatus,
} from '../types';
import type { Prisma } from '@prisma/client';

interface AttachmentBuffer {
    filename: string;
    content: Buffer;
    contentType: string;
}

interface CompanyInfoForPDF {
    name: string | null;
    nip: string | null;
    address: string | null;
    city: string | null;
    postalCode: string | null;
    phone: string | null;
    email: string | null;
    website?: string | null;
    logo?: string | null;
}

interface UserForPDF {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    companyInfo: CompanyInfoForPDF | null;
}

class EmailComposerService {
    private readonly frontendUrl: string;

    constructor() {
        this.frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    }

    private async getSmtpOrThrow(userId: string) {
        const config = await getDecryptedSmtpConfig(userId);
        if (!config) {
            throw new Error('SMTP_NOT_CONFIGURED');
        }
        return config;
    }

    private createTransporter(config: { host: string; port: number; user: string; pass: string; from: string }) {
        return nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.port === 465,
            auth: { user: config.user, pass: config.pass },
        });
    }

    private buildHtmlBody(body: string): string {
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

    private async generateOfferPDFBuffer(offerId: string, userId: string): Promise<AttachmentBuffer> {
        const offer = await prisma.offer.findFirst({
            where: { id: offerId, userId },
            include: {
                client: true,
                items: { orderBy: { position: 'asc' } },
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        phone: true,
                        companyInfo: {
                            select: {
                                name: true,
                                nip: true,
                                address: true,
                                city: true,
                                postalCode: true,
                                phone: true,
                                email: true,
                                website: true,
                                logo: true,
                            },
                        },
                    },
                },
                acceptanceLog: true,
            },
        });

        if (!offer) throw new Error('Oferta nie znaleziona');

        const userForPDF: UserForPDF = {
            id: offer.user.id,
            email: offer.user.email,
            name: offer.user.name,
            phone: offer.user.phone,
            companyInfo: offer.user.companyInfo,
        };

        const pdfUser = mapToPDFUser(userForPDF);
        const pdfClient = mapToPDFClient(offer.client);

        const pdfBuffer = await pdfService.generateOfferPDF({
            ...offer,
            user: pdfUser,
            client: pdfClient,
            acceptanceLog: null,
        });

        const safeNumber = offer.number.replace(/\//g, '-');
        return {
            filename: `Oferta_${safeNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
        };
    }

    private async generateContractPDFBuffer(contractId: string, userId: string): Promise<AttachmentBuffer> {
        const contract = await prisma.contract.findFirst({
            where: { id: contractId, userId },
            include: {
                client: true,
                items: { orderBy: { position: 'asc' } },
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        phone: true,
                        companyInfo: {
                            select: {
                                name: true,
                                nip: true,
                                address: true,
                                city: true,
                                postalCode: true,
                                phone: true,
                                email: true,
                                website: true,
                                logo: true,
                            },
                        },
                    },
                },
                signatureLog: true,
            },
        });

        if (!contract) throw new Error('Kontrakt nie znaleziony');

        const userForPDF: UserForPDF = {
            id: contract.user.id,
            email: contract.user.email,
            name: contract.user.name,
            phone: contract.user.phone,
            companyInfo: contract.user.companyInfo,
        };

        const pdfUser = mapToPDFUser(userForPDF);
        const pdfClient = mapToPDFClient(contract.client);

        const pdfBuffer = await pdfService.generateContractPDF({
            ...contract,
            user: pdfUser,
            client: pdfClient,
            signatureLog: undefined,
        });

        const safeNumber = contract.number.replace(/\//g, '-');
        return {
            filename: `Umowa_${safeNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
        };
    }

    private async resolveAttachments(
        attachments: EmailAttachment[],
        userId: string
    ): Promise<{ nodemailerAttachments: nodemailer.SendMailOptions['attachments']; linkLines: string[] }> {
        const nodemailerAttachments: nodemailer.SendMailOptions['attachments'] = [];
        const linkLines: string[] = [];

        for (const att of attachments) {
            if (att.type === 'offer_pdf') {
                const buf = await this.generateOfferPDFBuffer(att.resourceId, userId);
                nodemailerAttachments.push({
                    filename: buf.filename,
                    content: buf.content,
                    contentType: buf.contentType,
                });
            } else if (att.type === 'contract_pdf') {
                const buf = await this.generateContractPDFBuffer(att.resourceId, userId);
                nodemailerAttachments.push({
                    filename: buf.filename,
                    content: buf.content,
                    contentType: buf.contentType,
                });
            } else if (att.type === 'offer_link') {
                const offer = await prisma.offer.findFirst({
                    where: { id: att.resourceId, userId },
                    select: { publicToken: true, number: true },
                });
                if (offer?.publicToken) {
                    linkLines.push(`Oferta ${offer.number}: ${this.frontendUrl}/offer/view/${offer.publicToken}`);
                }
            } else if (att.type === 'contract_link') {
                const contract = await prisma.contract.findFirst({
                    where: { id: att.resourceId, userId },
                    select: { publicToken: true, number: true },
                });
                if (contract?.publicToken) {
                    linkLines.push(`Umowa ${contract.number}: ${this.frontendUrl}/contract/view/${contract.publicToken}`);
                }
            }
        }

        return { nodemailerAttachments, linkLines };
    }

    async sendEmail(userId: string, input: SendEmailInput): Promise<{ id: string; status: EmailLogStatus }> {
        if (input.saveAsDraft) {
            const log = await prisma.emailLog.create({
                data: {
                    userId,
                    to: input.to,
                    toName: input.toName,
                    subject: input.subject,
                    body: input.body,
                    status: 'DRAFT',
                    attachments: (input.attachments ?? []) as unknown as Prisma.InputJsonValue,
                    clientId: input.clientId,
                    offerId: input.offerId,
                    contractId: input.contractId,
                    templateId: input.templateId,
                    templateName: input.templateName,
                },
            });
            return { id: log.id, status: 'DRAFT' };
        }

        const smtpConfig = await this.getSmtpOrThrow(userId);
        const attachments = input.attachments ?? [];
        let errorMessage: string | undefined;
        let status: EmailLogStatus = 'SENT';

        const { nodemailerAttachments, linkLines } = await this.resolveAttachments(attachments, userId);

        let finalBody = input.body;
        if (linkLines.length > 0) {
            finalBody += '\n\n---\n' + linkLines.join('\n');
        }

        const htmlBody = this.buildHtmlBody(finalBody);

        try {
            const transporter = this.createTransporter(smtpConfig);
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

        const log = await prisma.emailLog.create({
            data: {
                userId,
                to: input.to,
                toName: input.toName,
                subject: input.subject,
                body: input.body,
                status,
                errorMessage,
                attachments: attachments as unknown as Prisma.InputJsonValue,
                clientId: input.clientId,
                offerId: input.offerId,
                contractId: input.contractId,
                templateId: input.templateId,
                templateName: input.templateName,
            },
        });

        return { id: log.id, status };
    }

    async sendDraft(userId: string, draftId: string): Promise<{ id: string; status: EmailLogStatus }> {
        const draft = await prisma.emailLog.findFirst({
            where: { id: draftId, userId, status: 'DRAFT' },
        });
        if (!draft) throw new Error('Szkic nie znaleziony');

        const attachments = (draft.attachments as unknown as EmailAttachment[]) ?? [];
        const smtpConfig = await this.getSmtpOrThrow(userId);
        let errorMessage: string | undefined;
        let newStatus: EmailLogStatus = 'SENT';

        const { nodemailerAttachments, linkLines } = await this.resolveAttachments(attachments, userId);

        let finalBody = draft.body;
        if (linkLines.length > 0) {
            finalBody += '\n\n---\n' + linkLines.join('\n');
        }

        const htmlBody = this.buildHtmlBody(finalBody);

        try {
            const transporter = this.createTransporter(smtpConfig);
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

        const updated = await prisma.emailLog.update({
            where: { id: draftId },
            data: {
                status: newStatus,
                errorMessage,
                sentAt: newStatus === 'SENT' ? new Date() : undefined,
            },
        });

        return { id: updated.id, status: newStatus };
    }

    async updateDraft(userId: string, draftId: string, input: UpdateDraftInput): Promise<{ id: string }> {
        const draft = await prisma.emailLog.findFirst({
            where: { id: draftId, userId, status: 'DRAFT' },
        });
        if (!draft) throw new Error('Szkic nie znaleziony');

        const updated = await prisma.emailLog.update({
            where: { id: draftId },
            data: {
                to: input.to,
                toName: input.toName,
                subject: input.subject,
                body: input.body,
                clientId: input.clientId,
                offerId: input.offerId,
                contractId: input.contractId,
                templateId: input.templateId,
                templateName: input.templateName,
                attachments: input.attachments !== undefined
                    ? (input.attachments as unknown as Prisma.InputJsonValue)
                    : undefined,
            },
        });

        return { id: updated.id };
    }

    async deleteEmailLog(userId: string, logId: string): Promise<void> {
        const log = await prisma.emailLog.findFirst({
            where: { id: logId, userId },
        });
        if (!log) throw new Error('Wiadomość nie znaleziona');
        await prisma.emailLog.delete({ where: { id: logId } });
    }

    async getEmailLogs(params: GetEmailLogsParams) {
        const { userId, page = 1, limit = 20, status, clientId, offerId, contractId, search } = params;

        const where: Prisma.EmailLogWhereInput = { userId };
        if (status) where.status = status;
        if (clientId) where.clientId = clientId;
        if (offerId) where.offerId = offerId;
        if (contractId) where.contractId = contractId;
        if (search) {
            where.OR = [
                { subject: { contains: search, mode: 'insensitive' } },
                { to: { contains: search, mode: 'insensitive' } },
                { toName: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [total, items] = await Promise.all([
            prisma.emailLog.count({ where }),
            prisma.emailLog.findMany({
                where,
                orderBy: { sentAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    client: { select: { id: true, name: true, email: true } },
                    offer: { select: { id: true, number: true, title: true } },
                    contract: { select: { id: true, number: true, title: true } },
                },
            }),
        ]);

        return {
            items,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getEmailLogById(userId: string, logId: string) {
        const log = await prisma.emailLog.findFirst({
            where: { id: logId, userId },
            include: {
                client: { select: { id: true, name: true, email: true } },
                offer: { select: { id: true, number: true, title: true } },
                contract: { select: { id: true, number: true, title: true } },
            },
        });
        if (!log) throw new Error('Wiadomość nie znaleziona');
        return log;
    }

    async createTemplate(userId: string, input: CreateEmailTemplateInput) {
        return prisma.emailTemplate.create({
            data: { userId, ...input },
        });
    }

    async updateTemplate(userId: string, templateId: string, input: UpdateEmailTemplateInput) {
        const template = await prisma.emailTemplate.findFirst({
            where: { id: templateId, userId, isBuiltIn: false },
        });
        if (!template) throw new Error('Szablon nie znaleziony');
        return prisma.emailTemplate.update({
            where: { id: templateId },
            data: input,
        });
    }

    async deleteTemplate(userId: string, templateId: string): Promise<void> {
        const template = await prisma.emailTemplate.findFirst({
            where: { id: templateId, userId, isBuiltIn: false },
        });
        if (!template) throw new Error('Szablon nie znaleziony lub jest wbudowany');
        await prisma.emailTemplate.delete({ where: { id: templateId } });
    }

    async getTemplates(userId: string) {
        return prisma.emailTemplate.findMany({
            where: { userId },
            orderBy: [{ isBuiltIn: 'desc' }, { createdAt: 'asc' }],
        });
    }

    async getTemplateById(userId: string, templateId: string) {
        const template = await prisma.emailTemplate.findFirst({
            where: { id: templateId, userId },
        });
        if (!template) throw new Error('Szablon nie znaleziony');
        return template;
    }
}

export const emailComposerService = new EmailComposerService();