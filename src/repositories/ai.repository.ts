// src/repositories/ai.repository.ts
import prisma from '../lib/prisma';
import { createModuleLogger } from '../lib/logger';

const logger = createModuleLogger('ai-repository');

export class AIRepository {
    async findHistoricalOfferItems(userId: string, itemName: string, limit = 20) {
        logger.debug({ userId, itemName, limit }, 'Finding historical offer items');

        return prisma.offerItem.findMany({
            where: {
                name: { contains: itemName, mode: 'insensitive' },
                offer: { userId },
            },
            include: {
                offer: {
                    select: {
                        title: true,
                        status: true,
                        createdAt: true,
                        client: { select: { name: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }

    async findLegacyInsights(userId: string, limit = 5) {
        logger.debug({ userId, limit }, 'Finding legacy insights');

        return prisma.offerLegacyInsight.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: { outcome: true, insights: true },
        });
    }

    async findOfferForObserver(offerId: string, userId: string) {
        logger.debug({ offerId, userId }, 'Finding offer for observer');

        return prisma.offer.findFirst({
            where: { id: offerId, userId },
            include: {
                items: { orderBy: { position: 'asc' } },
                client: { select: { name: true, company: true, type: true } },
                views: { orderBy: { viewedAt: 'asc' } },
                interactions: { orderBy: { createdAt: 'asc' }, take: 100 },
                comments: { orderBy: { createdAt: 'asc' } },
            },
        });
    }

    async findOfferForClosing(offerId: string, userId: string) {
        logger.debug({ offerId, userId }, 'Finding offer for closing strategy');

        return prisma.offer.findFirst({
            where: { id: offerId, userId },
            include: {
                items: { orderBy: { position: 'asc' } },
                client: { select: { name: true, company: true, type: true } },
                comments: { orderBy: { createdAt: 'asc' } },
            },
        });
    }
}

export const aiRepository = new AIRepository();