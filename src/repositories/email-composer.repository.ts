// src/repositories/email-composer.repository.ts

import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import type { GetEmailLogsParams, EmailAttachment } from '../types';
import type { EmailLogStatus } from '../types';

export interface CreateEmailLogData {
    userId: string;
    to: string;
    toName?: string | null;
    subject: string;
    body: string;
    status: EmailLogStatus;
    errorMessage?: string;
    attachments: EmailAttachment[];
    clientId?: string | null;
    offerId?: string | null;
    contractId?: string | null;
    templateId?: string | null;
    templateName?: string | null;
}

export interface UpdateEmailLogData {
    to?: string;
    toName?: string | null;
    subject?: string;
    body?: string;
    status?: EmailLogStatus;
    errorMessage?: string;
    sentAt?: Date;
    clientId?: string | null;
    offerId?: string | null;
    contractId?: string | null;
    templateId?: string | null;
    templateName?: string | null;
    attachments?: EmailAttachment[];
}

const emailLogRelationsInclude = {
    client: { select: { id: true, name: true, email: true } as const },
    offer: { select: { id: true, number: true, title: true } as const },
    contract: { select: { id: true, number: true, title: true } as const },
} as const;

export class EmailComposerRepository {
    async createLog(data: CreateEmailLogData) {
        return prisma.emailLog.create({
            data: {
                userId: data.userId,
                to: data.to,
                toName: data.toName,
                subject: data.subject,
                body: data.body,
                status: data.status,
                errorMessage: data.errorMessage,
                attachments: data.attachments as unknown as Prisma.InputJsonValue,
                clientId: data.clientId,
                offerId: data.offerId,
                contractId: data.contractId,
                templateId: data.templateId,
                templateName: data.templateName,
            },
        });
    }

    async updateLog(id: string, data: UpdateEmailLogData) {
        const prismaData: Prisma.EmailLogUpdateInput = {
            to: data.to,
            toName: data.toName,
            subject: data.subject,
            body: data.body,
            status: data.status,
            errorMessage: data.errorMessage,
            sentAt: data.sentAt,
            templateId: data.templateId,
            templateName: data.templateName,
        };

        // ← ZMIENIONE: nested updates dla relations
        if (data.clientId !== undefined) {
            prismaData.client = data.clientId ? { connect: { id: data.clientId } } : { disconnect: true };
        }

        if (data.offerId !== undefined) {
            prismaData.offer = data.offerId ? { connect: { id: data.offerId } } : { disconnect: true };
        }

        if (data.contractId !== undefined) {
            prismaData.contract = data.contractId ? { connect: { id: data.contractId } } : { disconnect: true };
        }

        if (data.attachments !== undefined) {
            prismaData.attachments = data.attachments as unknown as Prisma.InputJsonValue;
        }

        return prisma.emailLog.update({ where: { id }, data: prismaData });
    }

    async findLogById(id: string, userId: string) {
        return prisma.emailLog.findFirst({
            where: { id, userId },
            include: emailLogRelationsInclude,
        });
    }

    async findDraftById(id: string, userId: string) {
        return prisma.emailLog.findFirst({
            where: { id, userId, status: 'DRAFT' },
        });
    }

    async deleteLog(id: string) {
        return prisma.emailLog.delete({ where: { id } });
    }

    async findLogs(params: GetEmailLogsParams) {
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
                include: emailLogRelationsInclude,
            }),
        ]);

        return { items, total, page, limit };
    }

    async findOfferPublicToken(offerId: string, userId: string) {
        return prisma.offer.findFirst({
            where: { id: offerId, userId },
            select: { publicToken: true, number: true },
        });
    }

    async findContractPublicToken(contractId: string, userId: string) {
        return prisma.contract.findFirst({
            where: { id: contractId, userId },
            select: { publicToken: true, number: true },
        });
    }

    async createTemplate(userId: string, data: { name: string; subject: string; body: string }) {
        return prisma.emailTemplate.create({
            data: { userId, ...data },
        });
    }

    async updateTemplate(id: string, data: { name?: string; subject?: string; body?: string }) {
        return prisma.emailTemplate.update({ where: { id }, data });
    }

    async deleteTemplate(id: string) {
        return prisma.emailTemplate.delete({ where: { id } });
    }

    async findTemplateById(id: string, userId: string) {
        return prisma.emailTemplate.findFirst({
            where: { id, userId },
        });
    }

    async findTemplates(userId: string) {
        return prisma.emailTemplate.findMany({
            where: { userId },
            orderBy: [{ isBuiltIn: 'desc' }, { createdAt: 'asc' }],
        });
    }
}

export const emailComposerRepository = new EmailComposerRepository();