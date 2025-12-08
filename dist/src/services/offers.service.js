"use strict";
// src/services/offers.service.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
    create(userId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Sprawdź, czy klient należy do użytkownika
            const client = yield prisma_1.default.client.findFirst({
                where: { id: data.clientId, userId },
            });
            if (!client) {
                throw new Error('CLIENT_NOT_FOUND');
            }
            // Generuj numer oferty
            const number = yield (0, offerNumber_1.generateOfferNumber)(userId);
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
        });
    }
    findById(id, userId) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
    findAll(userId, query) {
        return __awaiter(this, void 0, void 0, function* () {
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
            const [offers, total] = yield Promise.all([
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
        });
    }
    update(id, userId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const existing = yield prisma_1.default.offer.findFirst({
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
                return prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                    yield tx.offerItem.deleteMany({ where: { offerId: id } });
                    return tx.offer.update({
                        where: { id },
                        data: Object.assign(Object.assign({}, updateData), { totalNet,
                            totalVat,
                            totalGross, items: {
                                create: itemsWithTotals,
                            } }),
                        include: {
                            client: true,
                            items: { orderBy: { position: 'asc' } },
                        },
                    });
                }));
            }
            return prisma_1.default.offer.update({
                where: { id },
                data: updateData,
                include: {
                    client: true,
                    items: { orderBy: { position: 'asc' } },
                },
            });
        });
    }
    delete(id, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const existing = yield prisma_1.default.offer.findFirst({
                where: { id, userId },
            });
            if (!existing) {
                return null;
            }
            return prisma_1.default.offer.delete({ where: { id } });
        });
    }
    getStats(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const statuses = yield prisma_1.default.offer.groupBy({
                by: ['status'],
                where: { userId },
                _count: { status: true },
                _sum: { totalGross: true },
            });
            const total = yield prisma_1.default.offer.count({ where: { userId } });
            const totalValue = yield prisma_1.default.offer.aggregate({
                where: { userId },
                _sum: { totalGross: true },
            });
            const acceptedValue = yield prisma_1.default.offer.aggregate({
                where: { userId, status: 'ACCEPTED' },
                _sum: { totalGross: true },
            });
            return {
                total,
                byStatus: statuses.reduce((acc, s) => {
                    var _a;
                    acc[s.status] = {
                        count: s._count.status,
                        value: ((_a = s._sum.totalGross) === null || _a === void 0 ? void 0 : _a.toNumber()) || 0,
                    };
                    return acc;
                }, {}),
                totalValue: ((_a = totalValue._sum.totalGross) === null || _a === void 0 ? void 0 : _a.toNumber()) || 0,
                acceptedValue: ((_b = acceptedValue._sum.totalGross) === null || _b === void 0 ? void 0 : _b.toNumber()) || 0,
            };
        });
    }
    duplicate(id, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const original = yield prisma_1.default.offer.findFirst({
                where: { id, userId },
                include: { items: true },
            });
            if (!original) {
                return null;
            }
            const number = yield (0, offerNumber_1.generateOfferNumber)(userId);
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
        });
    }
}
exports.OffersService = OffersService;
// Eksporty - oba warianty dla kompatybilności
exports.offersService = new OffersService();
