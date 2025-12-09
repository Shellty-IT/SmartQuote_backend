"use strict";
// src/services/offers.service.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.offersService = exports.OffersService = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const offerNumber_1 = require("../utils/offerNumber");
const library_1 = require("@prisma/client/runtime/library");
class OffersService {
    calculateItemTotals(item) {
        const quantity = new library_1.Decimal(item.quantity);
        const unitPrice = new library_1.Decimal(item.unitPrice);
        const vatRate = new library_1.Decimal(item.vatRate || 23);
        const discount = new library_1.Decimal(item.discount || 0);
        // Cena po rabacie
        const discountMultiplier = new library_1.Decimal(1).minus(discount.dividedBy(100));
        const effectiveUnitPrice = unitPrice.times(discountMultiplier);
        // Obliczenia
        const totalNet = quantity.times(effectiveUnitPrice);
        const totalVat = totalNet.times(vatRate.dividedBy(100));
        const totalGross = totalNet.plus(totalVat);
        return {
            totalNet: totalNet.toDecimalPlaces(2),
            totalVat: totalVat.toDecimalPlaces(2),
            totalGross: totalGross.toDecimalPlaces(2),
        };
    }
    async create(userId, data) {
        // Sprawdź, czy klient należy do użytkownika
        const client = await prisma_1.default.client.findFirst({
            where: { id: data.clientId, userId },
        });
        if (!client) {
            throw new Error('CLIENT_NOT_FOUND');
        }
        // Generuj numer oferty
        const number = await (0, offerNumber_1.generateOfferNumber)(userId);
        // Oblicz sumy pozycji
        const itemsWithTotals = data.items.map((item, index) => {
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
            };
        });
        // Oblicz sumy oferty
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
                    select: { followUps: true },
                },
            },
        });
    }
    async findAll(userId, query) {
        const page = parseInt(query.page || '1', 10);
        const limit = parseInt(query.limit || '20', 10);
        const skip = (page - 1) * limit;
        const where = { userId };
        // Filtrowanie
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
        // Sortowanie
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
        // Jeśli aktualizujemy pozycje, przelicz sumy
        let updateData = {
            title: data.title,
            description: data.description,
            status: data.status,
            validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
            notes: data.notes,
            terms: data.terms,
            paymentDays: data.paymentDays,
        };
        // Aktualizacja statusu - ustaw odpowiednie daty
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
        // Jeśli są nowe pozycje, usuń stare i dodaj nowe
        if (data.items && data.items.length > 0) {
            const itemsWithTotals = data.items.map((item, index) => {
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
                };
            });
            const totalNet = itemsWithTotals.reduce((sum, item) => sum.plus(item.totalNet), new library_1.Decimal(0));
            const totalVat = itemsWithTotals.reduce((sum, item) => sum.plus(item.totalVat), new library_1.Decimal(0));
            const totalGross = itemsWithTotals.reduce((sum, item) => sum.plus(item.totalGross), new library_1.Decimal(0));
            // Transakcja: usuń stare pozycje i dodaj nowe
            return prisma_1.default.$transaction(async (tx) => {
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
        return prisma_1.default.offer.update({
            where: { id },
            data: updateData,
            include: {
                client: true,
                items: { orderBy: { position: 'asc' } },
            },
        });
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
                    })),
                },
            },
            include: {
                client: true,
                items: { orderBy: { position: 'asc' } },
            },
        });
    }
}
exports.OffersService = OffersService;
// Eksporty - oba warianty dla kompatybilności
exports.offersService = new OffersService();
