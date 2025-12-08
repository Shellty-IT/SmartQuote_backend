"use strict";
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
exports.clientsService = exports.ClientsService = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
class ClientsService {
    create(userId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return prisma_1.default.client.create({
                data: Object.assign(Object.assign({}, data), { userId }),
            });
        });
    }
    findById(id, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return prisma_1.default.client.findFirst({
                where: { id, userId },
                include: {
                    _count: {
                        select: { offers: true, followUps: true },
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
                    { name: { contains: query.search, mode: 'insensitive' } },
                    { email: { contains: query.search, mode: 'insensitive' } },
                    { company: { contains: query.search, mode: 'insensitive' } },
                    { nip: { contains: query.search } },
                ];
            }
            if (query.type) {
                where.type = query.type;
            }
            if (query.isActive !== undefined) {
                where.isActive = query.isActive === 'true';
            }
            // Sortowanie
            const orderBy = {};
            const sortBy = query.sortBy || 'createdAt';
            const sortOrder = query.sortOrder || 'desc';
            orderBy[sortBy] = sortOrder;
            const [clients, total] = yield Promise.all([
                prisma_1.default.client.findMany({
                    where,
                    orderBy,
                    skip,
                    take: limit,
                    include: {
                        _count: {
                            select: { offers: true },
                        },
                    },
                }),
                prisma_1.default.client.count({ where }),
            ]);
            return { clients, total, page, limit };
        });
    }
    update(id, userId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Sprawdź czy klient należy do użytkownika
            const existing = yield prisma_1.default.client.findFirst({
                where: { id, userId },
            });
            if (!existing) {
                return null;
            }
            return prisma_1.default.client.update({
                where: { id },
                data,
            });
        });
    }
    delete(id, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Sprawdź czy klient należy do użytkownika
            const existing = yield prisma_1.default.client.findFirst({
                where: { id, userId },
            });
            if (!existing) {
                return null;
            }
            return prisma_1.default.client.delete({
                where: { id },
            });
        });
    }
    getStats(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const [total, active, withOffers] = yield Promise.all([
                prisma_1.default.client.count({ where: { userId } }),
                prisma_1.default.client.count({ where: { userId, isActive: true } }),
                prisma_1.default.client.count({
                    where: {
                        userId,
                        offers: { some: {} },
                    },
                }),
            ]);
            return { total, active, inactive: total - active, withOffers };
        });
    }
}
exports.ClientsService = ClientsService;
exports.clientsService = new ClientsService();
