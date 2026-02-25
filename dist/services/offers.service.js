"use strict";
// smartquote_backend/src/services/offers.service.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.offersService = exports.OffersService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const offerNumber_1 = require("../utils/offerNumber");
const library_1 = require("@prisma/client/runtime/library");
const ai_service_1 = require("./ai.service");
class OffersService {
    triggerPostMortem(userId, offerId, outcome) {
        ai_service_1.aiService.generatePostMortem(userId, offerId, outcome)
            .then(() => {
            console.log(`✅ Post-mortem generated for offer ${offerId} [${outcome}] (manual)`);
        })
            .catch((err) => {
            console.error(`❌ Post-mortem failed for offer ${offerId}:`, err);
        });
    }
    calculateItemTotals(item) {
        const quantity = new library_1.Decimal(item.quantity);
        const unitPrice = new library_1.Decimal(item.unitPrice);
        const vatRate = new library_1.Decimal(item.vatRate || 23);
        const discount = new library_1.Decimal(item.discount || 0);
        const discountMultiplier = new library_1.Decimal(1).minus(discount.dividedBy(100));
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
    buildItemWithTotals(item, index) {
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
        };
    }
    async create(userId, data) {
        const client = await prisma_1.default.client.findFirst({
            where: { id: data.clientId, userId },
        });
        if (!client) {
            throw new Error('CLIENT_NOT_FOUND');
        }
        const number = await (0, offerNumber_1.generateOfferNumber)(userId);
        const itemsWithTotals = data.items.map((item, index) => this.buildItemWithTotals(item, index));
        const totalNet = itemsWithTotals.reduce((sum, item) => sum.plus(item.totalNet), new library_1.Decimal(0));
        const totalVat = itemsWithTotals.reduce((sum, item) => sum.plus(item.totalVat), new library_1.Decimal(0));
        const totalGross = itemsWithTotals.reduce((sum, item) => sum.plus(item.totalGross), new library_1.Decimal(0));
        return prisma_1.default.offer.create({
            data: {
                number,
                title: data.title,
                description: data.description,
                validUntil: data.validUntil ? new Date(data.validUntil) : null,
                notes: data.notes,
                terms: data.terms,
                paymentDays: data.paymentDays || 14,
                totalNet,
                totalVat,
                totalGross,
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
    async findById(id, userId) {
        return prisma_1.default.offer.findFirst({
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
    async findAll(userId, query) {
        const page = parseInt(query.page || '1', 10);
        const limit = parseInt(query.limit || '20', 10);
        const skip = (page - 1) * limit;
        const where = { userId };
        if (query.search) {
            where.OR = [
                { number: { contains: query.search, mode: 'insensitive' } },
                { title: { contains: query.search, mode: 'insensitive' } },
                { client: { name: { contains: query.search, mode: 'insensitive' } } },
            ];
        }
        if (query.status) {
            where.status = query.status;
        }
        if (query.clientId) {
            where.clientId = query.clientId;
        }
        if (query.dateFrom || query.dateTo) {
            where.createdAt = {};
            if (query.dateFrom)
                where.createdAt.gte = new Date(query.dateFrom);
            if (query.dateTo)
                where.createdAt.lte = new Date(query.dateTo);
        }
        const orderBy = {};
        const sortBy = query.sortBy || 'createdAt';
        const sortOrder = query.sortOrder || 'desc';
        orderBy[sortBy] = sortOrder;
        const [offers, total] = await Promise.all([
            prisma_1.default.offer.findMany({
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
            prisma_1.default.offer.count({ where }),
        ]);
        return { offers, total, page, limit };
    }
    async update(id, userId, data) {
        const existing = await prisma_1.default.offer.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            return null;
        }
        const previousStatus = existing.status;
        let updateData = {
            title: data.title,
            description: data.description,
            status: data.status,
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
            const itemsWithTotals = data.items.map((item, index) => this.buildItemWithTotals(item, index));
            const totalNet = itemsWithTotals.reduce((sum, item) => sum.plus(item.totalNet), new library_1.Decimal(0));
            const totalVat = itemsWithTotals.reduce((sum, item) => sum.plus(item.totalVat), new library_1.Decimal(0));
            const totalGross = itemsWithTotals.reduce((sum, item) => sum.plus(item.totalGross), new library_1.Decimal(0));
            result = await prisma_1.default.$transaction(async (tx) => {
                await tx.offerItem.deleteMany({ where: { offerId: id } });
                return tx.offer.update({
                    where: { id },
                    data: {
                        ...updateData,
                        totalNet,
                        totalVat,
                        totalGross,
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
        }
        else {
            result = await prisma_1.default.offer.update({
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
            this.triggerPostMortem(userId, id, data.status);
        }
        return result;
    }
    async delete(id, userId) {
        const existing = await prisma_1.default.offer.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            return null;
        }
        return prisma_1.default.offer.delete({ where: { id } });
    }
    async getStats(userId) {
        const statuses = await prisma_1.default.offer.groupBy({
            by: ['status'],
            where: { userId },
            _count: { status: true },
            _sum: { totalGross: true },
        });
        const total = await prisma_1.default.offer.count({ where: { userId } });
        const totalValue = await prisma_1.default.offer.aggregate({
            where: { userId },
            _sum: { totalGross: true },
        });
        const acceptedValue = await prisma_1.default.offer.aggregate({
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
            }, {}),
            totalValue: totalValue._sum.totalGross?.toNumber() || 0,
            acceptedValue: acceptedValue._sum.totalGross?.toNumber() || 0,
        };
    }
    async duplicate(id, userId) {
        const original = await prisma_1.default.offer.findFirst({
            where: { id, userId },
            include: { items: true },
        });
        if (!original) {
            return null;
        }
        const number = await (0, offerNumber_1.generateOfferNumber)(userId);
        return prisma_1.default.offer.create({
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
                    })),
                },
            },
            include: {
                client: true,
                items: { orderBy: { position: 'asc' } },
            },
        });
    }
    async publishOffer(offerId, userId) {
        const offer = await prisma_1.default.offer.findFirst({
            where: { id: offerId, userId },
            select: {
                id: true,
                publicToken: true,
                isInteractive: true,
                status: true,
            },
        });
        if (!offer)
            return null;
        if (offer.publicToken && offer.isInteractive) {
            return {
                publicToken: offer.publicToken,
                publicUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/offer/view/${offer.publicToken}`,
                alreadyPublished: true,
            };
        }
        const publicToken = crypto_1.default.randomBytes(16).toString('base64url');
        const updated = await prisma_1.default.offer.update({
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
    async unpublishOffer(offerId, userId) {
        const offer = await prisma_1.default.offer.findFirst({
            where: { id: offerId, userId },
        });
        if (!offer)
            return null;
        await prisma_1.default.offer.update({
            where: { id: offerId },
            data: {
                publicToken: null,
                isInteractive: false,
            },
        });
        return true;
    }
    async getOfferAnalytics(offerId, userId) {
        const offer = await prisma_1.default.offer.findFirst({
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
        if (!offer)
            return null;
        const uniqueIps = new Set(offer.views.filter((v) => v.ipAddress).map((v) => v.ipAddress));
        return {
            ...offer,
            uniqueVisitors: uniqueIps.size,
            publicUrl: offer.publicToken
                ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/offer/view/${offer.publicToken}`
                : null,
        };
    }
    async getOfferComments(offerId, userId) {
        const offer = await prisma_1.default.offer.findFirst({
            where: { id: offerId, userId },
            select: { id: true },
        });
        if (!offer)
            return null;
        return prisma_1.default.offerComment.findMany({
            where: { offerId },
            orderBy: { createdAt: 'asc' },
        });
    }
    async addSellerComment(offerId, userId, content) {
        const offer = await prisma_1.default.offer.findFirst({
            where: { id: offerId, userId },
            select: { id: true },
        });
        if (!offer)
            return null;
        const [comment] = await prisma_1.default.$transaction([
            prisma_1.default.offerComment.create({
                data: {
                    offerId,
                    author: 'SELLER',
                    content,
                },
            }),
            prisma_1.default.offerInteraction.create({
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
exports.OffersService = OffersService;
exports.offersService = new OffersService();
