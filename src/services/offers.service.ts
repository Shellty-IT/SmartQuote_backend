import { Prisma, OfferStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { CreateOfferInput, UpdateOfferInput, PaginationQuery } from '../types';
import { generateOfferNumber } from '../utils/offerNumber';
import { Decimal } from '@prisma/client/runtime/library';

export class OffersService {
    private calculateItemTotals(item: {
        quantity: number;
        unitPrice: number;
        vatRate?: number;
        discount?: number;
    }) {
        const quantity = new Decimal(item.quantity);
        const unitPrice = new Decimal(item.unitPrice);
        const vatRate = new Decimal(item.vatRate || 23);
        const discount = new Decimal(item.discount || 0);

        // Cena po rabacie
        const discountMultiplier = new Decimal(1).minus(discount.dividedBy(100));
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

    async create(userId: string, data: CreateOfferInput) {
        // Sprawdź czy klient należy do użytkownika
        const client = await prisma.client.findFirst({
            where: { id: data.clientId, userId },
        });

        if (!client) {
            throw new Error('CLIENT_NOT_FOUND');
        }

        // Generuj numer oferty
        const number = await generateOfferNumber(userId);

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
        const totalNet = itemsWithTotals.reduce(
            (sum, item) => sum.plus(item.totalNet),
            new Decimal(0)
        );
        const totalVat = itemsWithTotals.reduce(
            (sum, item) => sum.plus(item.totalVat),
            new Decimal(0)
        );
        const totalGross = itemsWithTotals.reduce(
            (sum, item) => sum.plus(item.totalGross),
            new Decimal(0)
        );

        return prisma.offer.create({
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

    async findById(id: string, userId: string) {
        return prisma.offer.findFirst({
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

    async findAll(
        userId: string,
        query: PaginationQuery & { status?: string; clientId?: string; dateFrom?: string; dateTo?: string }
    ) {
        const page = parseInt(query.page || '1', 10);
        const limit = parseInt(query.limit || '20', 10);
        const skip = (page - 1) * limit;

        const where: Prisma.OfferWhereInput = { userId };

        // Filtrowanie
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

        // Sortowanie
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

        // Jeśli aktualizujemy pozycje, przelicz sumy
        let updateData: Prisma.OfferUpdateInput = {
            title: data.title,
            description: data.description,
            status: data.status as OfferStatus,
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

            const totalNet = itemsWithTotals.reduce(
                (sum, item) => sum.plus(item.totalNet),
                new Decimal(0)
            );
            const totalVat = itemsWithTotals.reduce(
                (sum, item) => sum.plus(item.totalVat),
                new Decimal(0)
            );
            const totalGross = itemsWithTotals.reduce(
                (sum, item) => sum.plus(item.totalGross),
                new Decimal(0)
            );

            // Transakcja: usuń stare pozycje i dodaj nowe
            return prisma.$transaction(async (tx) => {
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

        return prisma.offer.update({
            where: { id },
            data: updateData,
            include: {
                client: true,
                items: { orderBy: { position: 'asc' } },
            },
        });
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

export const offersService = new OffersService();