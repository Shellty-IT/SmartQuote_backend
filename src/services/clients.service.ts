import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { CreateClientInput, UpdateClientInput, PaginationQuery } from '../types';

export class ClientsService {
    async create(userId: string, data: CreateClientInput) {
        return prisma.client.create({
            data: {
                ...data,
                userId,
            },
        });
    }

    async findById(id: string, userId: string) {
        return prisma.client.findFirst({
            where: { id, userId },
            include: {
                _count: {
                    select: { offers: true, followUps: true },
                },
            },
        });
    }

    async findAll(userId: string, query: PaginationQuery & { type?: string; isActive?: string }) {
        const page = parseInt(query.page || '1', 10);
        const limit = parseInt(query.limit || '20', 10);
        const skip = (page - 1) * limit;

        const where: Prisma.ClientWhereInput = { userId };

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
            where.type = query.type as any;
        }

        if (query.isActive !== undefined) {
            where.isActive = query.isActive === 'true';
        }

        // Sortowanie
        const orderBy: Prisma.ClientOrderByWithRelationInput = {};
        const sortBy = query.sortBy || 'createdAt';
        const sortOrder = query.sortOrder || 'desc';
        orderBy[sortBy as keyof Prisma.ClientOrderByWithRelationInput] = sortOrder;

        const [clients, total] = await Promise.all([
            prisma.client.findMany({
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
            prisma.client.count({ where }),
        ]);

        return { clients, total, page, limit };
    }

    async update(id: string, userId: string, data: UpdateClientInput) {
        // Sprawdź czy klient należy do użytkownika
        const existing = await prisma.client.findFirst({
            where: { id, userId },
        });

        if (!existing) {
            return null;
        }

        return prisma.client.update({
            where: { id },
            data,
        });
    }

    async delete(id: string, userId: string) {
        // Sprawdź czy klient należy do użytkownika
        const existing = await prisma.client.findFirst({
            where: { id, userId },
        });

        if (!existing) {
            return null;
        }

        return prisma.client.delete({
            where: { id },
        });
    }

    async getStats(userId: string) {
        const [total, active, withOffers] = await Promise.all([
            prisma.client.count({ where: { userId } }),
            prisma.client.count({ where: { userId, isActive: true } }),
            prisma.client.count({
                where: {
                    userId,
                    offers: { some: {} },
                },
            }),
        ]);

        return { total, active, inactive: total - active, withOffers };
    }
}

export const clientsService = new ClientsService();