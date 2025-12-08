"use strict";
// src/services/followups.service.ts
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
exports.followUpsService = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
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
// Serwis
exports.followUpsService = {
    /**
     * Pobierz wszystkie follow-upy z filtrowaniem i paginacją
     */
    findAll(userId, query) {
        return __awaiter(this, void 0, void 0, function* () {
            const { page = 1, limit = 10, search, status, type, priority, clientId, offerId, contractId, dateFrom, dateTo, sortBy = 'dueDate', sortOrder = 'asc', overdue, upcoming, } = query;
            const skip = (page - 1) * limit;
            const now = new Date();
            // Budowanie warunków WHERE
            const where = {
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
                if (dateFrom)
                    where.dueDate.gte = dateFrom;
                if (dateTo)
                    where.dueDate.lte = dateTo;
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
            const [data, total] = yield Promise.all([
                prisma_1.default.followUp.findMany({
                    where,
                    include: followUpInclude,
                    skip,
                    take: limit,
                    orderBy: { [sortBy]: sortOrder },
                }),
                prisma_1.default.followUp.count({ where }),
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
        });
    },
    /**
     * Pobierz pojedynczy follow-up
     */
    findById(id, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return prisma_1.default.followUp.findFirst({
                where: { id, userId },
                include: followUpInclude,
            });
        });
    },
    /**
     * Utwórz nowy follow-up
     */
    create(userId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Walidacja relacji - klient
            if (data.clientId) {
                const client = yield prisma_1.default.client.findFirst({
                    where: { id: data.clientId, userId },
                });
                if (!client) {
                    throw new Error('Nie znaleziono klienta');
                }
            }
            // Walidacja relacji - oferta
            if (data.offerId) {
                const offer = yield prisma_1.default.offer.findFirst({
                    where: { id: data.offerId, userId },
                });
                if (!offer) {
                    throw new Error('Nie znaleziono oferty');
                }
            }
            // Walidacja relacji - umowa
            if (data.contractId) {
                const contract = yield prisma_1.default.contract.findFirst({
                    where: { id: data.contractId, userId },
                });
                if (!contract) {
                    throw new Error('Nie znaleziono umowy');
                }
            }
            return prisma_1.default.followUp.create({
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
        });
    },
    /**
     * Aktualizuj follow-up
     */
    update(id, userId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Sprawdź czy istnieje
            const existing = yield prisma_1.default.followUp.findFirst({
                where: { id, userId },
            });
            if (!existing) {
                throw new Error('Nie znaleziono follow-up');
            }
            // Przygotuj dane do aktualizacji
            const updateData = {};
            if (data.title !== undefined)
                updateData.title = data.title;
            if (data.description !== undefined)
                updateData.description = data.description;
            if (data.type !== undefined)
                updateData.type = data.type;
            if (data.priority !== undefined)
                updateData.priority = data.priority;
            if (data.dueDate !== undefined)
                updateData.dueDate = data.dueDate;
            if (data.notes !== undefined)
                updateData.notes = data.notes;
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
                }
                else if (data.status !== 'COMPLETED') {
                    updateData.completedAt = null;
                }
            }
            return prisma_1.default.followUp.update({
                where: { id },
                data: updateData,
                include: followUpInclude,
            });
        });
    },
    /**
     * Zmień status follow-up
     */
    updateStatus(id, userId, status, notes) {
        return __awaiter(this, void 0, void 0, function* () {
            const existing = yield prisma_1.default.followUp.findFirst({
                where: { id, userId },
            });
            if (!existing) {
                throw new Error('Nie znaleziono follow-up');
            }
            const updateData = { status };
            if (status === 'COMPLETED') {
                updateData.completedAt = new Date();
            }
            else {
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
            return prisma_1.default.followUp.update({
                where: { id },
                data: updateData,
                include: followUpInclude,
            });
        });
    },
    /**
     * Oznacz jako wykonane
     */
    complete(id, userId, notes) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.updateStatus(id, userId, 'COMPLETED', notes);
        });
    },
    /**
     * Usuń follow-up
     */
    delete(id, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const existing = yield prisma_1.default.followUp.findFirst({
                where: { id, userId },
            });
            if (!existing) {
                throw new Error('Nie znaleziono follow-up');
            }
            yield prisma_1.default.followUp.delete({ where: { id } });
        });
    },
    /**
     * Usuń wiele follow-upów
     */
    deleteMany(ids, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield prisma_1.default.followUp.deleteMany({
                where: {
                    id: { in: ids },
                    userId,
                },
            });
            return result.count;
        });
    },
    /**
     * Pobierz statystyki
     */
    getStats(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const todayEnd = new Date(todayStart);
            todayEnd.setDate(todayEnd.getDate() + 1);
            const weekEnd = new Date(todayStart);
            weekEnd.setDate(weekEnd.getDate() + 7);
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            // Pobierz wszystkie follow-upy użytkownika
            const allFollowUps = yield prisma_1.default.followUp.findMany({
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
            const stats = {
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
                if (followUp.completedAt &&
                    followUp.completedAt >= monthStart &&
                    followUp.completedAt < monthEnd) {
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
        });
    },
    /**
     * Pobierz nadchodzące follow-upy (dla dashboardu)
     */
    getUpcoming(userId_1) {
        return __awaiter(this, arguments, void 0, function* (userId, days = 7, limit = 5) {
            const now = new Date();
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + days);
            return prisma_1.default.followUp.findMany({
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
        });
    },
    /**
     * Pobierz przeterminowane follow-upy
     */
    getOverdue(userId, limit) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            return prisma_1.default.followUp.findMany({
                where: {
                    userId,
                    status: 'PENDING',
                    dueDate: { lt: now },
                },
                include: followUpInclude,
                orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
                take: limit,
            });
        });
    },
    /**
     * Aktualizuj statusy przeterminowanych
     */
    markOverdueFollowUps() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const result = yield prisma_1.default.followUp.updateMany({
                where: {
                    status: 'PENDING',
                    dueDate: { lt: now },
                },
                data: {
                    status: 'OVERDUE',
                },
            });
            return result.count;
        });
    },
    /**
     * Pobierz follow-upy powiązane z klientem
     */
    findByClientId(clientId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return prisma_1.default.followUp.findMany({
                where: { clientId, userId },
                include: followUpInclude,
                orderBy: { dueDate: 'asc' },
            });
        });
    },
    /**
     * Pobierz follow-upy powiązane z ofertą
     */
    findByOfferId(offerId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return prisma_1.default.followUp.findMany({
                where: { offerId, userId },
                include: followUpInclude,
                orderBy: { dueDate: 'asc' },
            });
        });
    },
    /**
     * Pobierz follow-upy powiązane z umową
     */
    findByContractId(contractId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return prisma_1.default.followUp.findMany({
                where: { contractId, userId },
                include: followUpInclude,
                orderBy: { dueDate: 'asc' },
            });
        });
    },
};
exports.default = exports.followUpsService;
