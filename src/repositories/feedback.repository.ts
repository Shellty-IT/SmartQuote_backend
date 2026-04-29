// src/repositories/feedback.repository.ts
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';

export interface InsightFilter {
    userId: string;
    outcome?: 'ACCEPTED' | 'REJECTED';
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    page: number;
    limit: number;
}

export interface CreateInsightData {
    offerId: string;
    userId: string;
    outcome: 'ACCEPTED' | 'REJECTED';
    insights: Prisma.InputJsonValue;
}

const insightWithOfferInclude = {
    offer: {
        select: {
            number: true,
            title: true,
            totalGross: true,
            client: { select: { name: true, company: true } },
        },
    },
} as const;

const insightListInclude = {
    offer: {
        select: {
            number: true,
            title: true,
            totalGross: true,
            status: true,
            currency: true,
            acceptedAt: true,
            rejectedAt: true,
            client: { select: { name: true, company: true } },
        },
    },
} as const;

export class FeedbackRepository {
    async findExisting(offerId: string, userId: string) {
        return prisma.offerLegacyInsight.findFirst({
            where: { offerId, userId },
        });
    }

    async findOfferForPostMortem(offerId: string, userId: string) {
        return prisma.offer.findFirst({
            where: { id: offerId, userId },
            include: {
                items: { orderBy: { position: 'asc' } },
                client: { select: { name: true, company: true, type: true } },
                interactions: { orderBy: { createdAt: 'asc' }, take: 50 },
                comments: { orderBy: { createdAt: 'asc' } },
                views: true,
            },
        });
    }

    async findAcceptedOffersForVariantStats(userId: string) {
        return prisma.offer.findMany({
            where: { userId, status: 'ACCEPTED' },
            orderBy: { acceptedAt: 'desc' },
            take: 50,
            select: { clientSelectedData: true },
        });
    }

    async createInsight(data: CreateInsightData) {
        return prisma.offerLegacyInsight.create({ data });
    }

    async findLatest(userId: string, limit: number) {
        return prisma.offerLegacyInsight.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: insightWithOfferInclude,
        });
    }

    async findList(filter: InsightFilter) {
        const skip = (filter.page - 1) * filter.limit;
        const where = this.buildWhereClause(filter);

        const [insights, total] = await Promise.all([
            prisma.offerLegacyInsight.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: filter.limit,
                include: insightListInclude,
            }),
            prisma.offerLegacyInsight.count({ where }),
        ]);

        return { insights, total };
    }

    private buildWhereClause(filter: InsightFilter): Record<string, unknown> {
        const where: Record<string, unknown> = { userId: filter.userId };

        if (filter.outcome) {
            where.outcome = filter.outcome;
        }

        if (filter.dateFrom || filter.dateTo) {
            const createdAtFilter: Record<string, Date> = {};
            if (filter.dateFrom) createdAtFilter.gte = new Date(filter.dateFrom);
            if (filter.dateTo) {
                const endDate = new Date(filter.dateTo);
                endDate.setHours(23, 59, 59, 999);
                createdAtFilter.lte = endDate;
            }
            where.createdAt = createdAtFilter;
        }

        if (filter.search) {
            where.offer = {
                OR: [
                    { title: { contains: filter.search, mode: 'insensitive' } },
                    { number: { contains: filter.search, mode: 'insensitive' } },
                    { client: { name: { contains: filter.search, mode: 'insensitive' } } },
                ],
            };
        }

        return where;
    }
}

export const feedbackRepository = new FeedbackRepository();