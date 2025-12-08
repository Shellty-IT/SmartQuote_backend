// src/controllers/followups.controller.ts

import { Response, NextFunction } from 'express';
import { FollowUpType, FollowUpStatus, Priority } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import followUpsService from '../services/followups.service';
import { successResponse, errorResponse, paginatedResponse } from '../utils/apiResponse';

// Stałe do walidacji
const VALID_STATUSES: FollowUpStatus[] = ['PENDING', 'COMPLETED', 'CANCELLED', 'OVERDUE'];
const VALID_TYPES: FollowUpType[] = ['CALL', 'EMAIL', 'MEETING', 'TASK', 'REMINDER', 'OTHER'];
const VALID_PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export const followUpsController = {
    /**
     * GET /followups
     */
    async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;

            // Walidacja i rzutowanie typów
            const statusParam = req.query.status as string | undefined;
            const typeParam = req.query.type as string | undefined;
            const priorityParam = req.query.priority as string | undefined;

            const query = {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
                search: req.query.search as string | undefined,
                status: statusParam && VALID_STATUSES.includes(statusParam as FollowUpStatus)
                    ? statusParam as FollowUpStatus
                    : undefined,
                type: typeParam && VALID_TYPES.includes(typeParam as FollowUpType)
                    ? typeParam as FollowUpType
                    : undefined,
                priority: priorityParam && VALID_PRIORITIES.includes(priorityParam as Priority)
                    ? priorityParam as Priority
                    : undefined,
                clientId: req.query.clientId as string | undefined,
                offerId: req.query.offerId as string | undefined,
                contractId: req.query.contractId as string | undefined,
                dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
                dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
                sortBy: (req.query.sortBy as string) || 'dueDate',
                sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'asc',
                overdue: req.query.overdue === 'true',
                upcoming: req.query.upcoming ? parseInt(req.query.upcoming as string) : undefined,
            };

            const result = await followUpsService.findAll(userId, query);

            return paginatedResponse(
                res,
                result.data,
                result.pagination.total,
                result.pagination.page,
                result.pagination.limit
            );
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /followups/stats
     */
    async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const stats = await followUpsService.getStats(userId);

            return successResponse(res, stats);
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /followups/upcoming
     */
    async getUpcoming(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const days = req.query.days ? parseInt(req.query.days as string) : 7;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;

            const followUps = await followUpsService.getUpcoming(userId, days, limit);

            return successResponse(res, followUps);
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /followups/overdue
     */
    async getOverdue(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

            const followUps = await followUpsService.getOverdue(userId, limit);

            return successResponse(res, followUps);
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /followups/:id
     */
    async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const { id } = req.params;

            const followUp = await followUpsService.findById(id, userId);

            if (!followUp) {
                return errorResponse(res, 'NOT_FOUND', 'Nie znaleziono follow-up', 404);
            }

            return successResponse(res, followUp);
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /followups
     */
    async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;

            const data = {
                ...req.body,
                dueDate: new Date(req.body.dueDate),
            };

            const followUp = await followUpsService.create(userId, data);

            return successResponse(res, followUp, 201);
        } catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('Nie znaleziono')) {
                    return errorResponse(res, 'BAD_REQUEST', error.message, 400);
                }
            }
            next(error);
        }
    },

    /**
     * PUT /followups/:id
     */
    async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const { id } = req.params;

            const data = { ...req.body };
            if (data.dueDate) {
                data.dueDate = new Date(data.dueDate);
            }

            const followUp = await followUpsService.update(id, userId, data);

            return successResponse(res, followUp);
        } catch (error) {
            if (error instanceof Error && error.message === 'Nie znaleziono follow-up') {
                return errorResponse(res, 'NOT_FOUND', error.message, 404);
            }
            next(error);
        }
    },

    /**
     * PATCH /followups/:id/status
     */
    async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const { id } = req.params;
            const { status, notes } = req.body;

            const followUp = await followUpsService.updateStatus(
                id,
                userId,
                status as FollowUpStatus,
                notes
            );

            return successResponse(res, followUp);
        } catch (error) {
            if (error instanceof Error && error.message === 'Nie znaleziono follow-up') {
                return errorResponse(res, 'NOT_FOUND', error.message, 404);
            }
            next(error);
        }
    },

    /**
     * PATCH /followups/:id/complete
     */
    async complete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const { id } = req.params;
            const notes = req.body?.notes as string | undefined;

            const followUp = await followUpsService.complete(id, userId, notes);

            return successResponse(res, followUp);
        } catch (error) {
            if (error instanceof Error && error.message === 'Nie znaleziono follow-up') {
                return errorResponse(res, 'NOT_FOUND', error.message, 404);
            }
            next(error);
        }
    },

    /**
     * DELETE /followups/:id
     */
    async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const { id } = req.params;

            await followUpsService.delete(id, userId);

            return successResponse(res, null);
        } catch (error) {
            if (error instanceof Error && error.message === 'Nie znaleziono follow-up') {
                return errorResponse(res, 'NOT_FOUND', error.message, 404);
            }
            next(error);
        }
    },

    /**
     * DELETE /followups/bulk
     */
    async deleteMany(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const { ids } = req.body;

            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return errorResponse(res, 'BAD_REQUEST', 'Brak ID do usunięcia', 400);
            }

            const count = await followUpsService.deleteMany(ids, userId);

            return successResponse(res, { deleted: count });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /followups/client/:clientId
     */
    async getByClient(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const { clientId } = req.params;

            const followUps = await followUpsService.findByClientId(clientId, userId);

            return successResponse(res, followUps);
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /followups/offer/:offerId
     */
    async getByOffer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const { offerId } = req.params;

            const followUps = await followUpsService.findByOfferId(offerId, userId);

            return successResponse(res, followUps);
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /followups/contract/:contractId
     */
    async getByContract(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const { contractId } = req.params;

            const followUps = await followUpsService.findByContractId(contractId, userId);

            return successResponse(res, followUps);
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /followups/mark-overdue
     */
    async markOverdue(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const count = await followUpsService.markOverdueFollowUps();

            return successResponse(res, { updated: count });
        } catch (error) {
            next(error);
        }
    },
};

export default followUpsController;