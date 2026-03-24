// src/services/followups.service.ts

import { Prisma, FollowUpStatus, FollowUpType, Priority } from '@prisma/client';
import prisma from '../lib/prisma';

export interface CreateFollowUpData {
    title: string;
    description?: string | null;
    type: FollowUpType;
    priority?: Priority;
    dueDate: Date;
    notes?: string | null;
    clientId?: string | null;
    offerId?: string | null;
    contractId?: string | null;
}

export interface UpdateFollowUpData {
    title?: string;
    description?: string | null;
    type?: FollowUpType;
    status?: FollowUpStatus;
    priority?: Priority;
    dueDate?: Date;
    notes?: string | null;
    clientId?: string | null;
    offerId?: string | null;
    contractId?: string | null;
}

export interface FollowUpQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: FollowUpStatus;
    type?: FollowUpType;
    priority?: Priority;
    clientId?: string;
    offerId?: string;
    contractId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    overdue?: boolean;
    upcoming?: number;
}

// Include dla relacji
const followUpInclude = {
    client: {
        select: {
            id: true,
            name: true,
            email: true,
            company: true,
        },
    },
    offer: {
        select: {
            id: true,
            number: true,
            title: true,
            status: true,
        },
    },
    contract: {
        select: {
            id: true,
            number: true,
            title: true,
            status: true,
        },
    },
};

// Interfejs dla statystyk
export interface FollowUpStats {
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    overdue: number;
    todayDue: number;
    thisWeekDue: number;
    completedThisMonth: number;
    completionRate: number;
}

// Serwis
export const followUpsService = {
    /**
     * Pobierz wszystkie follow-upy z filtrowaniem i paginacją
     */
    async findAll(userId: string, query: FollowUpQueryParams) {
        const {
            page = 1,
            limit = 10,
            search,
            status,
            type,
            priority,
            clientId,
            offerId,
            contractId,
            dateFrom,
            dateTo,
            sortBy = 'dueDate',
            sortOrder = 'asc',
            overdue,
            upcoming,
        } = query;

        const skip = (page - 1) * limit;
        const now = new Date();

        // Budowanie warunków WHERE
        const where: Prisma.FollowUpWhereInput = {
            userId,
        };

        // Wyszukiwanie tekstowe
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        // Filtry
        if (status) {
            where.status = status;
        }
        if (type) {
            where.type = type;
        }
        if (priority) {
            where.priority = priority;
        }
        if (clientId) {
            where.clientId = clientId;
        }
        if (offerId) {
            where.offerId = offerId;
        }
        if (contractId) {
            where.contractId = contractId;
        }

        // Filtr dat
        if (dateFrom || dateTo) {
            where.dueDate = {};
            if (dateFrom) where.dueDate.gte = dateFrom;
            if (dateTo) where.dueDate.lte = dateTo;
        }

        // Tylko przeterminowane
        if (overdue) {
            where.dueDate = { lt: now };
            where.status = 'PENDING';
        }

        // Nadchodzące w ciągu X dni
        if (upcoming) {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + upcoming);
            where.dueDate = { gte: now, lte: futureDate };
            where.status = 'PENDING';
        }

        // Wykonaj zapytania
        const [data, total] = await Promise.all([
            prisma.followUp.findMany({
                where,
                include: followUpInclude,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.followUp.count({ where }),
        ]);

        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    },

    /**
     * Pobierz pojedynczy follow-up
     */
    async findById(id: string, userId: string) {
        return prisma.followUp.findFirst({
            where: { id, userId },
            include: followUpInclude,
        });
    },

    /**
     * Utwórz nowy follow-up
     */
    async create(userId: string, data: CreateFollowUpData) {
        // Walidacja relacji - klient
        if (data.clientId) {
            const client = await prisma.client.findFirst({
                where: { id: data.clientId, userId },
            });
            if (!client) {
                throw new Error('Nie znaleziono klienta');
            }
        }

        // Walidacja relacji - oferta
        if (data.offerId) {
            const offer = await prisma.offer.findFirst({
                where: { id: data.offerId, userId },
            });
            if (!offer) {
                throw new Error('Nie znaleziono oferty');
            }
        }

        // Walidacja relacji - umowa
        if (data.contractId) {
            const contract = await prisma.contract.findFirst({
                where: { id: data.contractId, userId },
            });
            if (!contract) {
                throw new Error('Nie znaleziono umowy');
            }
        }

        return prisma.followUp.create({
            data: {
                title: data.title,
                description: data.description,
                type: data.type,
                priority: data.priority || 'MEDIUM',
                dueDate: data.dueDate,
                notes: data.notes,
                status: 'PENDING',
                userId: userId,
                clientId: data.clientId || null,
                offerId: data.offerId || null,
                contractId: data.contractId || null,
            },
            include: followUpInclude,
        });
    },

    /**
     * Aktualizuj follow-up
     */
    async update(id: string, userId: string, data: UpdateFollowUpData) {
        // Sprawdź czy istnieje
        const existing = await prisma.followUp.findFirst({
            where: { id, userId },
        });

        if (!existing) {
            throw new Error('Nie znaleziono follow-up');
        }

        // Przygotuj dane do aktualizacji
        const updateData: Prisma.FollowUpUpdateInput = {};

        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.type !== undefined) updateData.type = data.type;
        if (data.priority !== undefined) updateData.priority = data.priority;
        if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
        if (data.notes !== undefined) updateData.notes = data.notes;

        // Relacje - używamy connect/disconnect
        if (data.clientId !== undefined) {
            updateData.client = data.clientId
                ? { connect: { id: data.clientId } }
                : { disconnect: true };
        }
        if (data.offerId !== undefined) {
            updateData.offer = data.offerId
                ? { connect: { id: data.offerId } }
                : { disconnect: true };
        }
        if (data.contractId !== undefined) {
            updateData.contract = data.contractId
                ? { connect: { id: data.contractId } }
                : { disconnect: true };
        }

        // Jeśli status zmienia się na COMPLETED, ustaw completedAt
        if (data.status) {
            updateData.status = data.status;
            if (data.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
                updateData.completedAt = new Date();
            } else if (data.status !== 'COMPLETED') {
                updateData.completedAt = null;
            }
        }

        return prisma.followUp.update({
            where: { id },
            data: updateData,
            include: followUpInclude,
        });
    },

    /**
     * Zmień status follow-up
     */
    async updateStatus(id: string, userId: string, status: FollowUpStatus, notes?: string) {
        const existing = await prisma.followUp.findFirst({
            where: { id, userId },
        });

        if (!existing) {
            throw new Error('Nie znaleziono follow-up');
        }

        const updateData: Prisma.FollowUpUpdateInput = { status };

        if (status === 'COMPLETED') {
            updateData.completedAt = new Date();
        } else {
            updateData.completedAt = null;
        }

        // Dodaj notatkę do istniejących
        if (notes) {
            const existingNotes = existing.notes || '';
            const timestamp = new Date().toLocaleString('pl-PL');
            updateData.notes = existingNotes
                ? `${existingNotes}\n\n---\n${timestamp}: ${notes}`
                : `${timestamp}: ${notes}`;
        }

        return prisma.followUp.update({
            where: { id },
            data: updateData,
            include: followUpInclude,
        });
    },

    /**
     * Oznacz jako wykonane
     */
    async complete(id: string, userId: string, notes?: string) {
        return this.updateStatus(id, userId, 'COMPLETED', notes);
    },

    /**
     * Usuń follow-up
     */
    async delete(id: string, userId: string): Promise<void> {
        const existing = await prisma.followUp.findFirst({
            where: { id, userId },
        });

        if (!existing) {
            throw new Error('Nie znaleziono follow-up');
        }

        await prisma.followUp.delete({ where: { id } });
    },

    /**
     * Usuń wiele follow-upów
     */
    async deleteMany(ids: string[], userId: string): Promise<number> {
        const result = await prisma.followUp.deleteMany({
            where: {
                id: { in: ids },
                userId,
            },
        });
        return result.count;
    },

    /**
     * Pobierz statystyki
     */
    async getStats(userId: string): Promise<FollowUpStats> {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayEnd.getDate() + 1);

        const weekEnd = new Date(todayStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        // Pobierz wszystkie follow-upy użytkownika
        const allFollowUps = await prisma.followUp.findMany({
            where: { userId },
            select: {
                status: true,
                type: true,
                priority: true,
                dueDate: true,
                completedAt: true,
            },
        });

        // Inicjalizacja statystyk
        const stats: FollowUpStats = {
            total: allFollowUps.length,
            byStatus: {
                PENDING: 0,
                COMPLETED: 0,
                CANCELLED: 0,
                OVERDUE: 0,
            },
            byType: {
                CALL: 0,
                EMAIL: 0,
                MEETING: 0,
                TASK: 0,
                REMINDER: 0,
                OTHER: 0,
            },
            byPriority: {
                LOW: 0,
                MEDIUM: 0,
                HIGH: 0,
                URGENT: 0,
            },
            overdue: 0,
            todayDue: 0,
            thisWeekDue: 0,
            completedThisMonth: 0,
            completionRate: 0,
        };

        let totalToComplete = 0;
        let completed = 0;

        for (const followUp of allFollowUps) {
            // Status
            if (stats.byStatus[followUp.status] !== undefined) {
                stats.byStatus[followUp.status]++;
            }

            // Type
            if (stats.byType[followUp.type] !== undefined) {
                stats.byType[followUp.type]++;
            }

            // Priority
            if (stats.byPriority[followUp.priority] !== undefined) {
                stats.byPriority[followUp.priority]++;
            }

            // Przeterminowane (PENDING i po terminie)
            if (followUp.status === 'PENDING' && followUp.dueDate < now) {
                stats.overdue++;
            }

            // Dziś
            if (followUp.dueDate >= todayStart && followUp.dueDate < todayEnd) {
                stats.todayDue++;
            }

            // Ten tydzień
            if (followUp.dueDate >= todayStart && followUp.dueDate < weekEnd) {
                stats.thisWeekDue++;
            }

            // Ukończone w tym miesiącu
            if (
                followUp.completedAt &&
                followUp.completedAt >= monthStart &&
                followUp.completedAt < monthEnd
            ) {
                stats.completedThisMonth++;
            }

            // Wskaźnik ukończenia (nie liczymy CANCELLED)
            if (followUp.status !== 'CANCELLED') {
                totalToComplete++;
                if (followUp.status === 'COMPLETED') {
                    completed++;
                }
            }
        }

        stats.completionRate =
            totalToComplete > 0 ? Math.round((completed / totalToComplete) * 100) : 0;

        return stats;
    },

    /**
     * Pobierz nadchodzące follow-upy (dla dashboardu)
     */
    async getUpcoming(userId: string, days: number = 7, limit: number = 5) {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);

        return prisma.followUp.findMany({
            where: {
                userId,
                status: 'PENDING',
                dueDate: {
                    gte: now,
                    lte: futureDate,
                },
            },
            include: followUpInclude,
            orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
            take: limit,
        });
    },

    /**
     * Pobierz przeterminowane follow-upy
     */
    async getOverdue(userId: string, limit?: number) {
        const now = new Date();

        return prisma.followUp.findMany({
            where: {
                userId,
                status: 'PENDING',
                dueDate: { lt: now },
            },
            include: followUpInclude,
            orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
            take: limit,
        });
    },

    /**
     * Aktualizuj statusy przeterminowanych
     */
    async markOverdueFollowUps(): Promise<number> {
        const now = new Date();

        const result = await prisma.followUp.updateMany({
            where: {
                status: 'PENDING',
                dueDate: { lt: now },
            },
            data: {
                status: 'OVERDUE',
            },
        });

        return result.count;
    },

    /**
     * Pobierz follow-upy powiązane z klientem
     */
    async findByClientId(clientId: string, userId: string) {
        return prisma.followUp.findMany({
            where: { clientId, userId },
            include: followUpInclude,
            orderBy: { dueDate: 'asc' },
        });
    },

    /**
     * Pobierz follow-upy powiązane z ofertą
     */
    async findByOfferId(offerId: string, userId: string) {
        return prisma.followUp.findMany({
            where: { offerId, userId },
            include: followUpInclude,
            orderBy: { dueDate: 'asc' },
        });
    },

    /**
     * Pobierz follow-upy powiązane z umową
     */
    async findByContractId(contractId: string, userId: string) {
        return prisma.followUp.findMany({
            where: { contractId, userId },
            include: followUpInclude,
            orderBy: { dueDate: 'asc' },
        });
    },
};

export default followUpsService;