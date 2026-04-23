// src/repositories/offers.repository.ts

import { Prisma, OfferStatus } from '@prisma/client';
import prisma from '../lib/prisma';

export interface OffersFilter {
    userId: string;
    search?: string;
    status?: string;
    clientId?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
    limit?: string;
}

export interface OfferItemData {
    name: string;
    description?: string | null;
    quantity: number | Prisma.Decimal;
    unit: string;
    unitPrice: number | Prisma.Decimal;
    vatRate: number | Prisma.Decimal;
    discount: number | Prisma.Decimal;
    totalNet: number | Prisma.Decimal;
    totalVat: number | Prisma.Decimal;
    totalGross: number | Prisma.Decimal;
    position: number;
    isOptional?: boolean;
    isSelected?: boolean;
    minQuantity?: number | null;
    maxQuantity?: number | null;
    variantName?: string | null;
}

export interface CreateOfferData {
    number: string;
    title: string;
    description?: string | null;
    validUntil?: Date | null;
    notes?: string | null;
    terms?: string | null;
    paymentDays: number;
    requireAuditTrail: boolean;
    totalNet: Prisma.Decimal | number;
    totalVat: Prisma.Decimal | number;
    totalGross: Prisma.Decimal | number;
    userId: string;
    clientId: string;
    items: OfferItemData[];
}

export interface UpdateOfferData {
    title?: string;
    description?: string | null;
    status?: OfferStatus;
    validUntil?: Date | null;
    notes?: string | null;
    terms?: string | null;
    paymentDays?: number;
    requireAuditTrail?: boolean;
    sentAt?: Date;
    viewedAt?: Date;
    acceptedAt?: Date;
    rejectedAt?: Date;
    totalNet?: Prisma.Decimal | number;
    totalVat?: Prisma.Decimal | number;
    totalGross?: Prisma.Decimal | number;
    publicToken?: string | null;
    isInteractive?: boolean;
}

const offerWithClientSelect = {
    client: {
        select: { id: true, name: true, company: true } as const,
    },
    _count: {
        select: { items: true } as const,
    },
} as const;

const offerFullInclude = {
    client: true,
    items: {
        orderBy: { position: 'asc' } as const,
    },
    acceptanceLog: true,
    _count: {
        select: { followUps: true, comments: true, views: true } as const,
    },
} as const;

const offerWithUserInclude = {
    client: true,
    items: { orderBy: { position: 'asc' } as const },
    acceptanceLog: true,
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
                    logo: true,
                } as const,
            },
        } as const,
    },
} as const;

function mapItemToPrisma(item: OfferItemData): Prisma.OfferItemCreateWithoutOfferInput {
    return {
        name: item.name,
        description: item.description ?? undefined,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate,
        discount: item.discount,
        totalNet: item.totalNet,
        totalVat: item.totalVat,
        totalGross: item.totalGross,
        position: item.position,
        isOptional: item.isOptional,
        isSelected: item.isSelected,
        minQuantity: item.minQuantity ?? undefined,
        maxQuantity: item.maxQuantity ?? undefined,
        variantName: item.variantName ?? undefined,
    };
}

export class OffersRepository {
    async findById(id: string, userId: string) {
        return prisma.offer.findFirst({
            where: { id, userId },
            include: offerFullInclude,
        });
    }

    async findByIdWithUser(id: string, userId: string) {
        return prisma.offer.findFirst({
            where: { id, userId },
            include: offerWithUserInclude,
        });
    }

    async findByIdPublicFields(id: string, userId: string) {
        return prisma.offer.findFirst({
            where: { id, userId },
            select: {
                id: true,
                publicToken: true,
                isInteractive: true,
                status: true,
            },
        });
    }

    async findByIdForEmail(id: string, userId: string) {
        return prisma.offer.findFirst({
            where: { id, userId },
            include: {
                client: true,
                user: {
                    select: {
                        name: true,
                        email: true,
                        companyInfo: {
                            select: { name: true } as const,
                        },
                    } as const,
                },
            },
        });
    }

    async findByIdForPDFAttachment(id: string, userId: string) {
        return prisma.offer.findFirst({
            where: { id, userId },
            include: {
                client: true,
                items: { orderBy: { position: 'asc' } as const },
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
                            } as const,
                        },
                    } as const,
                },
                acceptanceLog: true,
            },
        });
    }

    async findByPublicToken(publicToken: string) {
        return prisma.offer.findFirst({
            where: { publicToken },
        });
    }

    async findAll(filter: OffersFilter) {
        const page = parseInt(filter.page ?? '1', 10);
        const limit = parseInt(filter.limit ?? '20', 10);
        const skip = (page - 1) * limit;

        const where: Prisma.OfferWhereInput = { userId: filter.userId };

        if (filter.search) {
            where.OR = [
                { number: { contains: filter.search, mode: 'insensitive' } },
                { title: { contains: filter.search, mode: 'insensitive' } },
                { client: { name: { contains: filter.search, mode: 'insensitive' } } },
            ];
        }

        if (filter.status) {
            where.status = filter.status as OfferStatus;
        }

        if (filter.clientId) {
            where.clientId = filter.clientId;
        }

        if (filter.dateFrom || filter.dateTo) {
            where.createdAt = {};
            if (filter.dateFrom) where.createdAt.gte = new Date(filter.dateFrom);
            if (filter.dateTo) where.createdAt.lte = new Date(filter.dateTo);
        }

        const sortBy = filter.sortBy ?? 'createdAt';
        const sortOrder = filter.sortOrder ?? 'desc';
        const orderBy: Prisma.OfferOrderByWithRelationInput = {
            [sortBy]: sortOrder,
        };

        const [offers, total] = await Promise.all([
            prisma.offer.findMany({
                where,
                orderBy,
                skip,
                take: limit,
                include: offerWithClientSelect,
            }),
            prisma.offer.count({ where }),
        ]);

        return { offers, total, page, limit };
    }

    async create(data: CreateOfferData) {
        const { items, ...offerData } = data;

        return prisma.offer.create({
            data: {
                ...offerData,
                items: {
                    create: items.map(mapItemToPrisma),
                },
            },
            include: {
                client: {
                    select: { id: true, name: true, email: true, company: true } as const,
                },
                items: {
                    orderBy: { position: 'asc' } as const,
                },
            },
        });
    }

    async update(id: string, data: UpdateOfferData) {
        return prisma.offer.update({
            where: { id },
            data,
            include: {
                client: true,
                items: { orderBy: { position: 'asc' } as const },
            },
        });
    }

    async updateWithItems(
        id: string,
        data: UpdateOfferData,
        items: OfferItemData[],
    ) {
        return prisma.$transaction(async (tx) => {
            await tx.offerItem.deleteMany({ where: { offerId: id } });

            return tx.offer.update({
                where: { id },
                data: {
                    ...data,
                    items: { create: items.map(mapItemToPrisma) },
                },
                include: {
                    client: true,
                    items: { orderBy: { position: 'asc' } as const },
                },
            });
        });
    }

    async delete(id: string) {
        return prisma.offer.delete({ where: { id } });
    }

    async groupByStatus(userId: string) {
        return prisma.offer.groupBy({
            by: ['status'],
            where: { userId },
            _count: { status: true },
            _sum: { totalGross: true },
        });
    }

    async count(userId: string) {
        return prisma.offer.count({ where: { userId } });
    }

    async aggregateTotalGross(userId: string, statusFilter?: OfferStatus) {
        return prisma.offer.aggregate({
            where: { userId, ...(statusFilter ? { status: statusFilter } : {}) },
            _sum: { totalGross: true },
        });
    }

    async findForDuplicate(id: string, userId: string) {
        return prisma.offer.findFirst({
            where: { id, userId },
            include: { items: true },
        });
    }

    async findForAnalytics(id: string, userId: string) {
        return prisma.offer.findFirst({
            where: { id, userId },
            select: {
                id: true,
                number: true,
                title: true,
                status: true,
                publicToken: true,
                isInteractive: true,
                viewCount: true,
                lastViewedAt: true,
                acceptedAt: true,
                rejectedAt: true,
                clientSelectedData: true,
                validUntil: true,
                totalNet: true,
                totalGross: true,
                views: {
                    orderBy: { viewedAt: 'desc' as const },
                    take: 50,
                },
                interactions: {
                    orderBy: { createdAt: 'desc' as const },
                    take: 100,
                },
                comments: {
                    orderBy: { createdAt: 'asc' as const },
                },
            },
        });
    }

    async findComments(offerId: string) {
        return prisma.offerComment.findMany({
            where: { offerId },
            orderBy: { createdAt: 'asc' },
        });
    }

    async createCommentWithInteraction(offerId: string, content: string) {
        const [comment] = await prisma.$transaction([
            prisma.offerComment.create({
                data: { offerId, author: 'SELLER', content },
            }),
            prisma.offerInteraction.create({
                data: {
                    offerId,
                    type: 'COMMENT',
                    details: { content, author: 'SELLER' } as unknown as Prisma.InputJsonValue,
                },
            }),
        ]);

        return comment;
    }
}

export const offersRepository = new OffersRepository();