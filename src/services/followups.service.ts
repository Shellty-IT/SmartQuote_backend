// src/services/followups.service.ts
import { Prisma, FollowUpStatus, FollowUpType, Priority } from '@prisma/client';
import {
    followUpsRepository,
    CreateFollowUpData,
    UpdateFollowUpData,
    FollowUpQueryParams,
} from '../repositories/followups.repository';

export type { CreateFollowUpData, UpdateFollowUpData, FollowUpQueryParams };

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

function computeStats(
    allFollowUps: Array<{
        status: FollowUpStatus;
        type: FollowUpType;
        priority: Priority;
        dueDate: Date;
        completedAt: Date | null;
    }>,
): FollowUpStats {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const weekEnd = new Date(todayStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const stats: FollowUpStats = {
        total: allFollowUps.length,
        byStatus: { PENDING: 0, COMPLETED: 0, CANCELLED: 0, OVERDUE: 0 },
        byType: { CALL: 0, EMAIL: 0, MEETING: 0, TASK: 0, REMINDER: 0, OTHER: 0 },
        byPriority: { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 },
        overdue: 0,
        todayDue: 0,
        thisWeekDue: 0,
        completedThisMonth: 0,
        completionRate: 0,
    };

    let totalToComplete = 0;
    let completed = 0;

    for (const f of allFollowUps) {
        if (f.status in stats.byStatus) stats.byStatus[f.status]++;
        if (f.type in stats.byType) stats.byType[f.type]++;
        if (f.priority in stats.byPriority) stats.byPriority[f.priority]++;

        if (f.status === 'PENDING' && f.dueDate < now) stats.overdue++;
        if (f.dueDate >= todayStart && f.dueDate < todayEnd) stats.todayDue++;
        if (f.dueDate >= todayStart && f.dueDate < weekEnd) stats.thisWeekDue++;
        if (f.completedAt && f.completedAt >= monthStart && f.completedAt < monthEnd) {
            stats.completedThisMonth++;
        }

        if (f.status !== 'CANCELLED') {
            totalToComplete++;
            if (f.status === 'COMPLETED') completed++;
        }
    }

    stats.completionRate =
        totalToComplete > 0 ? Math.round((completed / totalToComplete) * 100) : 0;

    return stats;
}

export const followUpsService = {
    async findAll(userId: string, query: FollowUpQueryParams) {
        const { data, total, page, limit } = await followUpsRepository.findAll(userId, query);
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

    async findById(id: string, userId: string) {
        return followUpsRepository.findById(id, userId);
    },

    async create(userId: string, data: CreateFollowUpData) {
        await followUpsRepository.validateRelations(userId, data);
        return followUpsRepository.create(userId, data);
    },

    async update(id: string, userId: string, data: UpdateFollowUpData) {
        const existing = await followUpsRepository.findById(id, userId);
        if (!existing) throw new Error('Nie znaleziono follow-up');

        const updateData: Prisma.FollowUpUpdateInput = {};

        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.type !== undefined) updateData.type = data.type;
        if (data.priority !== undefined) updateData.priority = data.priority;
        if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
        if (data.notes !== undefined) updateData.notes = data.notes;

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

        if (data.status) {
            updateData.status = data.status;
            if (data.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
                updateData.completedAt = new Date();
            } else if (data.status !== 'COMPLETED') {
                updateData.completedAt = null;
            }
        }

        return followUpsRepository.update(id, updateData);
    },

    async updateStatus(id: string, userId: string, status: FollowUpStatus, notes?: string) {
        const existing = await followUpsRepository.findById(id, userId);
        if (!existing) throw new Error('Nie znaleziono follow-up');

        const updateData: Prisma.FollowUpUpdateInput = { status };

        if (status === 'COMPLETED') {
            updateData.completedAt = new Date();
        } else {
            updateData.completedAt = null;
        }

        if (notes) {
            const timestamp = new Date().toLocaleString('pl-PL');
            updateData.notes = existing.notes
                ? `${existing.notes}\n\n---\n${timestamp}: ${notes}`
                : `${timestamp}: ${notes}`;
        }

        return followUpsRepository.update(id, updateData);
    },

    async complete(id: string, userId: string, notes?: string) {
        return this.updateStatus(id, userId, 'COMPLETED', notes);
    },

    async delete(id: string, userId: string): Promise<void> {
        const existing = await followUpsRepository.findById(id, userId);
        if (!existing) throw new Error('Nie znaleziono follow-up');
        await followUpsRepository.delete(id);
    },

    async deleteMany(ids: string[], userId: string): Promise<number> {
        const result = await followUpsRepository.deleteMany(ids, userId);
        return result.count;
    },

    async getStats(userId: string): Promise<FollowUpStats> {
        const all = await followUpsRepository.findAllRaw(userId);
        return computeStats(all);
    },

    async getUpcoming(userId: string, days = 7, limit = 5) {
        return followUpsRepository.findUpcoming(userId, days, limit);
    },

    async getOverdue(userId: string, limit?: number) {
        return followUpsRepository.findOverdue(userId, limit);
    },

    async markOverdueFollowUps(): Promise<number> {
        const result = await followUpsRepository.markOverdue();
        return result.count;
    },

    async findByClientId(clientId: string, userId: string) {
        return followUpsRepository.findByClientId(clientId, userId);
    },

    async findByOfferId(offerId: string, userId: string) {
        return followUpsRepository.findByOfferId(offerId, userId);
    },

    async findByContractId(contractId: string, userId: string) {
        return followUpsRepository.findByContractId(contractId, userId);
    },
};

export default followUpsService;