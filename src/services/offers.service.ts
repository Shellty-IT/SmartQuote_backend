// smartquote_backend/src/services/offers.service.ts

import crypto from 'crypto';
import { Prisma, OfferStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { CreateOfferInput, UpdateOfferInput, PaginationQuery, OfferItemInput } from '../types';
import { generateOfferNumber } from '../utils/offerNumber';
import { Decimal } from '@prisma/client/runtime/library';
import { aiService } from './ai.service';
import { emailService } from './email.service';
import { getDecryptedSmtpConfig } from './settings.service';

interface ItemCalculation {
    quantity: number;
    unitPrice: number;
    vatRate?: number;
    discount?: number;
}

interface ItemWithTotals {
    name: string;
    description: string | undefined;
    quantity: number;
    unit: string;
    unitPrice: number;
    vatRate: number;
    discount: number;
    totalNet: Decimal;
    totalVat: Decimal;
    totalGross: Decimal;
    position: number;
    isOptional: boolean;
    isSelected: boolean;
    minQuantity: number;
    maxQuantity: number;
    variantName: string | null;
}

export class OffersService {
    private triggerPostMortem(userId: string, offerId: string, outcome: 'ACCEPTED' | 'REJECTED'): void {
        aiService.generatePostMortem(userId, offerId, outcome)
            .then(() => {
                console.log(`✅ Post-mortem generated for offer ${offerId} [${outcome}] (manual)`);
            })
            .catch((err: unknown) => {
                console.error(`❌ Post-mortem failed for offer ${offerId}:`, err);
            });
    }

    private calculateItemTotals(item: ItemCalculation): {
        totalNet: Decimal;
        totalVat: Decimal;
        totalGross: Decimal;
    } {
        const quantity = new Decimal(item.quantity);
        const unitPrice = new Decimal(item.unitPrice);
        const vatRate = new Decimal(item.vatRate || 23);
        const discount = new Decimal(item.discount || 0);

        const discountMultiplier = new Decimal(1).minus(discount.dividedBy(100));
        const effectiveUnitPrice = unitPrice.times(discountMultiplier);

        const totalNet = quantity.times(effectiveUnitPrice);
        const totalVat = totalNet.times(vatRate.dividedBy(100));
        const totalGross = totalNet.plus(totalVat);

        return {
            totalNet: totalNet.toDecimalPlaces(2),
            totalVat: totalVat.toDecimalPlaces(2),
            totalGross: totalGross.toDecimalPlaces(2),
        };
    }

    private buildItemWithTotals(item: OfferItemInput, index: number): ItemWithTotals {
        const totals = this.calculateItemTotals(item);
        return {
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit || 'szt.',
            unitPrice: item.unitPrice,
            vatRate: item.vatRate || 23,
            discount: item.discount || 0,
            totalNet: totals.totalNet,
            totalVat: totals.totalVat,
            totalGross: totals.totalGross,
            position: index,
            isOptional: item.isOptional || false,
            isSelected: true,
            minQuantity: item.minQuantity || 1,
            maxQuantity: item.maxQuantity || 100,
            variantName: item.variantName || null,
        };
    }

    private calculateOfferTotals(items: ItemWithTotals[]): {
        totalNet: Decimal;
        totalVat: Decimal;
        totalGross: Decimal;
    } {
        const baseItems = items.filter((item) => !item.variantName);

        if (baseItems.length === items.length) {
            return {
                totalNet: items.reduce((sum, item) => sum.plus(item.totalNet), new Decimal(0)),
                totalVat: items.reduce((sum, item) => sum.plus(item.totalVat), new Decimal(0)),
                totalGross: items.reduce((sum, item) => sum.plus(item.totalGross), new Decimal(0)),
            };
        }

        const variantNames = [...new Set(items.filter((i) => i.variantName).map((i) => i.variantName!))];
        const firstVariantItems = items.filter((i) => i.variantName === variantNames[0]);
        const allDefaultItems = [...baseItems, ...firstVariantItems];

        return {
            totalNet: allDefaultItems.reduce((sum, item) => sum.plus(item.totalNet), new Decimal(0)),
            totalVat: allDefaultItems.reduce((sum, item) => sum.plus(item.totalVat), new Decimal(0)),
            totalGross: allDefaultItems.reduce((sum, item) => sum.plus(item.totalGross), new Decimal(0)),
        };
    }

    async create(userId: string, data: CreateOfferInput) {
        const client = await prisma.client.findFirst({
            where: { id: data.clientId, userId },
        });

        if (!client) {
            throw new Error('CLIENT_NOT_FOUND');
        }

        const number = await generateOfferNumber(userId);

        const itemsWithTotals = data.items.map((item: OfferItemInput, index: number) =>
            this.buildItemWithTotals(item, index)
        );

        const offerTotals = this.calculateOfferTotals(itemsWithTotals);

        return prisma.offer.create({
            data: {
                number,
                title: data.title,
                description: data.description,
                validUntil: data.validUntil ? new Date(data.validUntil) : null,
                notes: data.notes,
                terms: data.terms,
                paymentDays: data.paymentDays || 14,
                totalNet: offerTotals.totalNet,
                totalVat: offerTotals.totalVat,
                totalGross: offerTotals.totalGross,
                userId,
                clientId: data.clientId,
                items: {
                    create: itemsWithTotals,
                },
            },
            include: {
                client: {
                    select: { id: true, name: true, email: true, company: true },
                },
                items: {
                    orderBy: { position: 'asc' },
                },
            },
        });
    }

    async findById(id: string, userId: string) {
        return prisma.offer.findFirst({
            where: { id, userId },
            include: {
                client: true,
                items: {
                    orderBy: { position: 'asc' },
                },
                _count: {
                    select: { followUps: true, comments: true, views: true },
                },
            },
        });
    }

    async findAll(
        userId: string,
        query: PaginationQuery & { status?: string; clientId?: string; dateFrom?: string; dateTo?: string }
    ) {
        const page = parseInt(query.page || '1', 10);
        const limit = parseInt(query.limit || '20', 10);
        const skip = (page - 1) * limit;

        const where: Prisma.OfferWhereInput = { userId };

        if (query.search) {
            where.OR = [
                { number: { contains: query.search, mode: 'insensitive' } },
                { title: { contains: query.search, mode: 'insensitive' } },
                { client: { name: { contains: query.search, mode: 'insensitive' } } },
            ];
        }

        if (query.status) {
            where.status = query.status as OfferStatus;
        }

        if (query.clientId) {
            where.clientId = query.clientId;
        }

        if (query.dateFrom || query.dateTo) {
            where.createdAt = {};
            if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
            if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
        }

        const orderBy: Prisma.OfferOrderByWithRelationInput = {};
        const sortBy = query.sortBy || 'createdAt';
        const sortOrder = query.sortOrder || 'desc';
        orderBy[sortBy as keyof Prisma.OfferOrderByWithRelationInput] = sortOrder;

        const [offers, total] = await Promise.all([
            prisma.offer.findMany({
                where,
                orderBy,
                skip,
                take: limit,
                include: {
                    client: {
                        select: { id: true, name: true, company: true },
                    },
                    _count: {
                        select: { items: true },
                    },
                },
            }),
            prisma.offer.count({ where }),
        ]);

        return { offers, total, page, limit };
    }

    async update(id: string, userId: string, data: UpdateOfferInput) {
        const existing = await prisma.offer.findFirst({
            where: { id, userId },
        });

        if (!existing) {
            return null;
        }

        const previousStatus = existing.status;

        let updateData: Prisma.OfferUpdateInput = {
            title: data.title,
            description: data.description,
            status: data.status as OfferStatus,
            validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
            notes: data.notes,
            terms: data.terms,
            paymentDays: data.paymentDays,
        };

        if (data.status) {
            const now = new Date();
            switch (data.status) {
                case 'SENT':
                    updateData.sentAt = now;
                    break;
                case 'VIEWED':
                    updateData.viewedAt = now;
                    break;
                case 'ACCEPTED':
                    updateData.acceptedAt = now;
                    break;
                case 'REJECTED':
                    updateData.rejectedAt = now;
                    break;
            }
        }

        let result;

        if (data.items && data.items.length > 0) {
            const itemsWithTotals = data.items.map((item: OfferItemInput, index: number) =>
                this.buildItemWithTotals(item, index)
            );

            const offerTotals = this.calculateOfferTotals(itemsWithTotals);

            result = await prisma.$transaction(async (tx) => {
                await tx.offerItem.deleteMany({ where: { offerId: id } });

                return tx.offer.update({
                    where: { id },
                    data: {
                        ...updateData,
                        totalNet: offerTotals.totalNet,
                        totalVat: offerTotals.totalVat,
                        totalGross: offerTotals.totalGross,
                        items: {
                            create: itemsWithTotals,
                        },
                    },
                    include: {
                        client: true,
                        items: { orderBy: { position: 'asc' } },
                    },
                });
            });
        } else {
            result = await prisma.offer.update({
                where: { id },
                data: updateData,
                include: {
                    client: true,
                    items: { orderBy: { position: 'asc' } },
                },
            });
        }

        const isTerminalChange = data.status &&
            (data.status === 'ACCEPTED' || data.status === 'REJECTED') &&
            previousStatus !== data.status;

        if (isTerminalChange) {
            this.triggerPostMortem(userId, id, data.status as 'ACCEPTED' | 'REJECTED');
        }

        return result;
    }

    async delete(id: string, userId: string) {
        const existing = await prisma.offer.findFirst({
            where: { id, userId },
        });

        if (!existing) {
            return null;
        }

        return prisma.offer.delete({ where: { id } });
    }

    async getStats(userId: string) {
        const statuses = await prisma.offer.groupBy({
            by: ['status'],
            where: { userId },
            _count: { status: true },
            _sum: { totalGross: true },
        });

        const total = await prisma.offer.count({ where: { userId } });

        const totalValue = await prisma.offer.aggregate({
            where: { userId },
            _sum: { totalGross: true },
        });

        const acceptedValue = await prisma.offer.aggregate({
            where: { userId, status: 'ACCEPTED' },
            _sum: { totalGross: true },
        });

        return {
            total,
            byStatus: statuses.reduce((acc, s) => {
                acc[s.status] = {
                    count: s._count.status,
                    value: s._sum.totalGross?.toNumber() || 0,
                };
                return acc;
            }, {} as Record<string, { count: number; value: number }>),
            totalValue: totalValue._sum.totalGross?.toNumber() || 0,
            acceptedValue: acceptedValue._sum.totalGross?.toNumber() || 0,
        };
    }

    async duplicate(id: string, userId: string) {
        const original = await prisma.offer.findFirst({
            where: { id, userId },
            include: { items: true },
        });

        if (!original) {
            return null;
        }

        const number = await generateOfferNumber(userId);

        return prisma.offer.create({
            data: {
                number,
                title: `${original.title} (kopia)`,
                description: original.description,
                status: 'DRAFT',
                validUntil: null,
                notes: original.notes,
                terms: original.terms,
                paymentDays: original.paymentDays,
                totalNet: original.totalNet,
                totalVat: original.totalVat,
                totalGross: original.totalGross,
                currency: original.currency,
                userId,
                clientId: original.clientId,
                items: {
                    create: original.items.map((item) => ({
                        name: item.name,
                        description: item.description,
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
                        isSelected: true,
                        minQuantity: item.minQuantity,
                        maxQuantity: item.maxQuantity,
                        variantName: item.variantName,
                    })),
                },
            },
            include: {
                client: true,
                items: { orderBy: { position: 'asc' } },
            },
        });
    }

    async publishOffer(offerId: string, userId: string) {
        const offer = await prisma.offer.findFirst({
            where: { id: offerId, userId },
            select: {
                id: true,
                publicToken: true,
                isInteractive: true,
                status: true,
            },
        });

        if (!offer) return null;

        if (offer.publicToken && offer.isInteractive) {
            return {
                publicToken: offer.publicToken,
                publicUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/offer/view/${offer.publicToken}`,
                alreadyPublished: true,
            };
        }

        const publicToken = crypto.randomBytes(16).toString('base64url');

        const updated = await prisma.offer.update({
            where: { id: offerId },
            data: {
                publicToken,
                isInteractive: true,
                status: offer.status === 'DRAFT' ? 'SENT' : offer.status,
                sentAt: offer.status === 'DRAFT' ? new Date() : undefined,
            },
        });

        return {
            publicToken: updated.publicToken,
            publicUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/offer/view/${updated.publicToken}`,
            alreadyPublished: false,
        };
    }

    async unpublishOffer(offerId: string, userId: string) {
        const offer = await prisma.offer.findFirst({
            where: { id: offerId, userId },
        });

        if (!offer) return null;

        await prisma.offer.update({
            where: { id: offerId },
            data: {
                publicToken: null,
                isInteractive: false,
            },
        });

        return true;
    }

    async sendOfferToClient(offerId: string, userId: string): Promise<{ sent: boolean; email: string }> {
        const offer = await prisma.offer.findFirst({
            where: { id: offerId, userId },
            include: {
                client: true,
                user: {
                    select: {
                        name: true,
                        email: true,
                        companyInfo: {
                            select: { name: true },
                        },
                    },
                },
            },
        });

        if (!offer) {
            throw new Error('OFFER_NOT_FOUND');
        }

        if (!offer.client.email) {
            throw new Error('CLIENT_NO_EMAIL');
        }

        const smtpConfig = await getDecryptedSmtpConfig(userId);
        if (!smtpConfig) {
            throw new Error('SMTP_NOT_CONFIGURED');
        }

        let publicUrl: string;

        if (offer.publicToken && offer.isInteractive) {
            publicUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/offer/view/${offer.publicToken}`;
        } else {
            const publishResult = await this.publishOffer(offerId, userId);
            if (!publishResult) {
                throw new Error('PUBLISH_FAILED');
            }
            publicUrl = publishResult.publicUrl;
        }

        const sent = await emailService.sendOfferLink(
            offer.client.email,
            {
                offerNumber: offer.number,
                offerTitle: offer.title,
                clientName: offer.client.name,
                totalGross: Number(offer.totalGross),
                currency: offer.currency,
                validUntil: offer.validUntil ? offer.validUntil.toISOString() : null,
                publicUrl,
                sellerName: offer.user.name || offer.user.email,
                companyName: offer.user.companyInfo?.name || null,
            },
            smtpConfig
        );

        if (!sent) {
            throw new Error('EMAIL_SEND_FAILED');
        }

        return { sent: true, email: offer.client.email };
    }

    async getOfferAnalytics(offerId: string, userId: string) {
        const offer = await prisma.offer.findFirst({
            where: { id: offerId, userId },
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
                    orderBy: { viewedAt: 'desc' },
                    take: 50,
                },
                interactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 100,
                },
                comments: {
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!offer) return null;

        const uniqueIps = new Set(
            offer.views.filter((v) => v.ipAddress).map((v) => v.ipAddress)
        );

        return {
            ...offer,
            uniqueVisitors: uniqueIps.size,
            publicUrl: offer.publicToken
                ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/offer/view/${offer.publicToken}`
                : null,
        };
    }

    async getOfferComments(offerId: string, userId: string) {
        const offer = await prisma.offer.findFirst({
            where: { id: offerId, userId },
            select: { id: true },
        });

        if (!offer) return null;

        return prisma.offerComment.findMany({
            where: { offerId },
            orderBy: { createdAt: 'asc' },
        });
    }

    async addSellerComment(offerId: string, userId: string, content: string) {
        const offer = await prisma.offer.findFirst({
            where: { id: offerId, userId },
            select: { id: true },
        });

        if (!offer) return null;

        const [comment] = await prisma.$transaction([
            prisma.offerComment.create({
                data: {
                    offerId,
                    author: 'SELLER',
                    content,
                },
            }),
            prisma.offerInteraction.create({
                data: {
                    offerId,
                    type: 'COMMENT',
                    details: { content, author: 'SELLER' },
                },
            }),
        ]);

        return comment;
    }
}

export const offersService = new OffersService();