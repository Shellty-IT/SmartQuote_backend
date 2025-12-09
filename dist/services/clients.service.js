"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientsService = exports.ClientsService = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
class ClientsService {
    async create(userId, data) {
        return prisma_1.default.client.create({
            data: {
                ...data,
                userId,
            },
        });
    }
    async findById(id, userId) {
        return prisma_1.default.client.findFirst({
            where: { id, userId },
            include: {
                _count: {
                    select: { offers: true, followUps: true },
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
        const [clients, total] = await Promise.all([
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
    }
    async update(id, userId, data) {
        // Sprawdź czy klient należy do użytkownika
        const existing = await prisma_1.default.client.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            return null;
        }
        return prisma_1.default.client.update({
            where: { id },
            data,
        });
    }
    async delete(id, userId) {
        // Sprawdź czy klient należy do użytkownika
        const existing = await prisma_1.default.client.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            return null;
        }
        return prisma_1.default.client.delete({
            where: { id },
        });
    }
    async getStats(userId) {
        const [total, active, withOffers] = await Promise.all([
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
    }
}
exports.ClientsService = ClientsService;
exports.clientsService = new ClientsService();
