"use strict";
// smartquote_backend/src/services/contracts.service.ts
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
exports.getContracts = getContracts;
exports.getContractById = getContractById;
exports.createContract = createContract;
exports.updateContract = updateContract;
exports.deleteContract = deleteContract;
exports.createContractFromOffer = createContractFromOffer;
exports.getContractsStats = getContractsStats;
const prisma_1 = __importDefault(require("../lib/prisma"));
// Helper do konwersji daty
function toDate(value) {
    if (!value)
        return null;
    if (value instanceof Date)
        return value;
    return new Date(value);
}
// Generowanie numeru umowy
function generateContractNumber(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const year = new Date().getFullYear();
        const count = yield prisma_1.default.contract.count({
            where: {
                userId,
                createdAt: {
                    gte: new Date(`${year}-01-01`),
                    lt: new Date(`${year + 1}-01-01`),
                },
            },
        });
        const number = String(count + 1).padStart(3, '0');
        return `UMW/${year}/${number}`;
    });
}
// Obliczanie pozycji
function calculateItem(item) {
    var _a, _b, _c, _d;
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    const vatRate = Number((_a = item.vatRate) !== null && _a !== void 0 ? _a : 23);
    const discount = Number((_b = item.discount) !== null && _b !== void 0 ? _b : 0);
    const netBeforeDiscount = quantity * unitPrice;
    const discountAmount = netBeforeDiscount * (discount / 100);
    const totalNet = netBeforeDiscount - discountAmount;
    const totalVat = totalNet * (vatRate / 100);
    const totalGross = totalNet + totalVat;
    return {
        name: item.name,
        description: item.description,
        quantity,
        unit: (_c = item.unit) !== null && _c !== void 0 ? _c : 'szt.',
        unitPrice,
        vatRate,
        discount,
        totalNet,
        totalVat,
        totalGross,
        position: (_d = item.position) !== null && _d !== void 0 ? _d : 0,
    };
}
// Pobieranie listy umów
function getContracts(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const { userId, page = 1, limit = 10, status, clientId, search } = params;
        const where = { userId };
        if (status) {
            where.status = status;
        }
        if (clientId) {
            where.clientId = clientId;
        }
        if (search) {
            where.OR = [
                { number: { contains: search, mode: 'insensitive' } },
                { title: { contains: search, mode: 'insensitive' } },
                { client: { name: { contains: search, mode: 'insensitive' } } },
            ];
        }
        const [contracts, total] = yield Promise.all([
            prisma_1.default.contract.findMany({
                where,
                include: {
                    client: true,
                    _count: { select: { items: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma_1.default.contract.count({ where }),
        ]);
        return {
            data: contracts,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    });
}
// Pobieranie jednej umowy
function getContractById(id, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const contract = yield prisma_1.default.contract.findFirst({
            where: { id, userId },
            include: {
                client: true,
                offer: true,
                items: { orderBy: { position: 'asc' } },
            },
        });
        return contract;
    });
}
// Tworzenie umowy
function createContract(userId, data) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const number = yield generateContractNumber(userId);
        // Oblicz pozycje
        const calculatedItems = data.items.map((item, index) => {
            var _a;
            return (Object.assign(Object.assign({}, calculateItem(item)), { position: (_a = item.position) !== null && _a !== void 0 ? _a : index }));
        });
        // Oblicz sumy
        const totalNet = calculatedItems.reduce((sum, item) => sum + item.totalNet, 0);
        const totalVat = calculatedItems.reduce((sum, item) => sum + item.totalVat, 0);
        const totalGross = calculatedItems.reduce((sum, item) => sum + item.totalGross, 0);
        const contract = yield prisma_1.default.contract.create({
            data: {
                number,
                title: data.title,
                description: data.description,
                clientId: data.clientId,
                offerId: data.offerId,
                userId,
                startDate: toDate(data.startDate),
                endDate: toDate(data.endDate),
                terms: data.terms,
                paymentTerms: data.paymentTerms,
                paymentDays: (_a = data.paymentDays) !== null && _a !== void 0 ? _a : 14,
                notes: data.notes,
                totalNet,
                totalVat,
                totalGross,
                items: {
                    create: calculatedItems,
                },
            },
            include: {
                client: true,
                items: true,
            },
        });
        return contract;
    });
}
// Aktualizacja umowy
function updateContract(id, userId, data) {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = yield prisma_1.default.contract.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            return null;
        }
        let itemsData = undefined;
        let totals = {};
        if (data.items) {
            // Usuń stare pozycje i dodaj nowe
            yield prisma_1.default.contractItem.deleteMany({ where: { contractId: id } });
            const calculatedItems = data.items.map((item, index) => {
                var _a;
                return (Object.assign(Object.assign({}, calculateItem(item)), { position: (_a = item.position) !== null && _a !== void 0 ? _a : index }));
            });
            itemsData = { create: calculatedItems };
            totals = {
                totalNet: calculatedItems.reduce((sum, item) => sum + item.totalNet, 0),
                totalVat: calculatedItems.reduce((sum, item) => sum + item.totalVat, 0),
                totalGross: calculatedItems.reduce((sum, item) => sum + item.totalGross, 0),
            };
        }
        const contract = yield prisma_1.default.contract.update({
            where: { id },
            data: Object.assign(Object.assign({ title: data.title, description: data.description, status: data.status, startDate: data.startDate !== undefined ? toDate(data.startDate) : undefined, endDate: data.endDate !== undefined ? toDate(data.endDate) : undefined, signedAt: data.signedAt !== undefined ? toDate(data.signedAt) : undefined, terms: data.terms, paymentTerms: data.paymentTerms, paymentDays: data.paymentDays, notes: data.notes }, totals), { items: itemsData }),
            include: {
                client: true,
                items: { orderBy: { position: 'asc' } },
            },
        });
        return contract;
    });
}
// Usuwanie umowy
function deleteContract(id, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = yield prisma_1.default.contract.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            return false;
        }
        yield prisma_1.default.contract.delete({ where: { id } });
        return true;
    });
}
// Tworzenie umowy z oferty
function createContractFromOffer(offerId, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const offer = yield prisma_1.default.offer.findFirst({
            where: { id: offerId, userId },
            include: {
                client: true,
                items: { orderBy: { position: 'asc' } },
            },
        });
        if (!offer) {
            return null;
        }
        const contractData = {
            title: `Umowa - ${offer.title}`,
            description: (_a = offer.description) !== null && _a !== void 0 ? _a : undefined,
            clientId: offer.clientId,
            offerId: offer.id,
            terms: (_b = offer.terms) !== null && _b !== void 0 ? _b : undefined,
            paymentDays: offer.paymentDays,
            items: offer.items.map(item => {
                var _a;
                return ({
                    name: item.name,
                    description: (_a = item.description) !== null && _a !== void 0 ? _a : undefined,
                    quantity: Number(item.quantity),
                    unit: item.unit,
                    unitPrice: Number(item.unitPrice),
                    vatRate: Number(item.vatRate),
                    discount: Number(item.discount),
                    position: item.position,
                });
            }),
        };
        return createContract(userId, contractData);
    });
}
// Statystyki umów
function getContractsStats(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const [total, byStatus, values] = yield Promise.all([
            prisma_1.default.contract.count({ where: { userId } }),
            prisma_1.default.contract.groupBy({
                by: ['status'],
                where: { userId },
                _count: { status: true },
            }),
            prisma_1.default.contract.aggregate({
                where: { userId },
                _sum: { totalGross: true },
            }),
            prisma_1.default.contract.aggregate({
                where: { userId, status: 'ACTIVE' },
                _sum: { totalGross: true },
            }),
        ]);
        const statusCounts = {
            DRAFT: 0,
            PENDING_SIGNATURE: 0,
            ACTIVE: 0,
            COMPLETED: 0,
            TERMINATED: 0,
            EXPIRED: 0,
        };
        byStatus.forEach(item => {
            statusCounts[item.status] = item._count.status;
        });
        const activeContracts = yield prisma_1.default.contract.aggregate({
            where: { userId, status: 'ACTIVE' },
            _sum: { totalGross: true },
        });
        return {
            total,
            byStatus: statusCounts,
            totalValue: Number((_a = values._sum.totalGross) !== null && _a !== void 0 ? _a : 0),
            activeValue: Number((_b = activeContracts._sum.totalGross) !== null && _b !== void 0 ? _b : 0),
        };
    });
}
exports.default = {
    getContracts,
    getContractById,
    createContract,
    updateContract,
    deleteContract,
    createContractFromOffer,
    getContractsStats,
};
