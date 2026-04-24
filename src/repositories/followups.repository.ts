// src/repositories/followups.repository.ts
import { Prisma, FollowUpStatus, FollowUpType, Priority } from '@prisma/client';
import prisma from '../lib/prisma';

export interface FollowUpQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: FollowUpStatus;
    type?: FollowUpType;
    priority?: Priority;
    clientId?: string;
    offerId?: string;
    contractId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    overdue?: boolean;
    upcoming?: number;
}

export interface CreateFollowUpData {
    title: string;
    description?: string | null;
    type: FollowUpType;
    priority?: Priority;
    dueDate: Date;
    notes?: string | null;
    clientId?: string | null;
    offerId?: string | null;
    contractId?: string | null;
}

export interface UpdateFollowUpData {
    title?: string;
    description?: string | null;
    type?: FollowUpType;
    status?: FollowUpStatus;
    priority?: Priority;
    dueDate?: Date;
    notes?: string | null;
    clientId?: string | null;
    offerId?: string | null;
    contractId?: string | null;
}

const followUpInclude = {
    client: {
        select: { id: true, name: true, email: true, company: true },
    },
    offer: {
        select: { id: true, number: true, title: true, status: true },
    },
    contract: {
        select: { id: true, number: true, title: true, status: true },
    },
} satisfies Prisma.FollowUpInclude;

function buildWhereClause(userId: string, query: FollowUpQueryParams): Prisma.FollowUpWhereInput {
    const now = new Date();
    const where: Prisma.FollowUpWhereInput = { userId };

    if (query.search) {
        where.OR = [
            { title: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
        ];
    }

    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.priority) where.priority = query.priority;
    if (query.clientId) where.clientId = query.clientId;
    if (query.offerId) where.offerId = query.offerId;
    if (query.contractId) where.contractId = query.contractId;

    if (query.dateFrom || query.dateTo) {
        where.dueDate = {};
        if (query.dateFrom) where.dueDate.gte = query.dateFrom;
        if (query.dateTo) where.dueDate.lte = query.dateTo;
    }

    if (query.overdue) {
        where.dueDate = { lt: now };
        where.status = 'PENDING';
    }

    if (query.upcoming) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + query.upcoming);
        where.dueDate = { gte: now, lte: futureDate };
        where.status = 'PENDING';
    }

    return where;
}

export const followUpsRepository = {
    async findAll(userId: string, query: FollowUpQueryParams) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const skip = (page - 1) * limit;
        const sortBy = query.sortBy ?? 'dueDate';
        const sortOrder = query.sortOrder ?? 'asc';
        const where = buildWhereClause(userId, query);

        const [data, total] = await Promise.all([
            prisma.followUp.findMany({
                where,
                include: followUpInclude,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.followUp.count({ where }),
        ]);

        return { data, total, page, limit };
    },

    findById(id: string, userId: string) {
        return prisma.followUp.findFirst({
            where: { id, userId },
            include: followUpInclude,
        });
    },

    create(userId: string, data: CreateFollowUpData) {
        return prisma.followUp.create({
            data: {
                title: data.title,
                description: data.description,
                type: data.type,
                priority: data.priority ?? 'MEDIUM',
                dueDate: data.dueDate,
                notes: data.notes,
                status: 'PENDING',
                userId,
                clientId: data.clientId ?? null,
                offerId: data.offerId ?? null,
                contractId: data.contractId ?? null,
            },
            include: followUpInclude,
        });
    },

    update(id: string, data: Prisma.FollowUpUpdateInput) {
        return prisma.followUp.update({
            where: { id },
            data,
            include: followUpInclude,
        });
    },

    delete(id: string) {
        return prisma.followUp.delete({ where: { id } });
    },

    deleteMany(ids: string[], userId: string) {
        return prisma.followUp.deleteMany({
            where: { id: { in: ids }, userId },
        });
    },

    findAllRaw(userId: string) {
        return prisma.followUp.findMany({
            where: { userId },
            select: {
                status: true,
                type: true,
                priority: true,
                dueDate: true,
                completedAt: true,
            },
        });
    },

    markOverdue() {
        return prisma.followUp.updateMany({
            where: { status: 'PENDING', dueDate: { lt: new Date() } },
            data: { status: 'OVERDUE' },
        });
    },

    findUpcoming(userId: string, days: number, limit: number) {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);

        return prisma.followUp.findMany({
            where: {
                userId,
                status: 'PENDING',
                dueDate: { gte: now, lte: futureDate },
            },
            include: followUpInclude,
            orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
            take: limit,
        });
    },

    findOverdue(userId: string, limit?: number) {
        return prisma.followUp.findMany({
            where: { userId, status: 'PENDING', dueDate: { lt: new Date() } },
            include: followUpInclude,
            orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
            take: limit,
        });
    },

    findByClientId(clientId: string, userId: string) {
        return prisma.followUp.findMany({
            where: { clientId, userId },
            include: followUpInclude,
            orderBy: { dueDate: 'asc' },
        });
    },

    findByOfferId(offerId: string, userId: string) {
        return prisma.followUp.findMany({
            where: { offerId, userId },
            include: followUpInclude,
            orderBy: { dueDate: 'asc' },
        });
    },

    findByContractId(contractId: string, userId: string) {
        return prisma.followUp.findMany({
            where: { contractId, userId },
            include: followUpInclude,
            orderBy: { dueDate: 'asc' },
        });
    },

    async validateRelations(userId: string, data: Pick<CreateFollowUpData, 'clientId' | 'offerId' | 'contractId'>) {
        if (data.clientId) {
            const client = await prisma.client.findFirst({ where: { id: data.clientId, userId } });
            if (!client) throw new Error('Nie znaleziono klienta');
        }
        if (data.offerId) {
            const offer = await prisma.offer.findFirst({ where: { id: data.offerId, userId } });
            if (!offer) throw new Error('Nie znaleziono oferty');
        }
        if (data.contractId) {
            const contract = await prisma.contract.findFirst({ where: { id: data.contractId, userId } });
            if (!contract) throw new Error('Nie znaleziono umowy');
        }
    },
};