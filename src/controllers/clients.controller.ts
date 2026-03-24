import { Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import { clientsService } from '@/services/clients.service';
import { successResponse, errorResponse, paginatedResponse } from '../utils/apiResponse';

export class ClientsController {
    async create(req: AuthenticatedRequest, res: Response) {
        try {
            const client = await clientsService.create(req.user!.id, req.body);
            return successResponse(res, client, 201);
        } catch (error) {
            console.error('[Clients] Create error:', error);
            return errorResponse(res, 'CREATE_FAILED', 'Nie udało się utworzyć klienta', 500);
        }
    }

    async findById(req: AuthenticatedRequest, res: Response) {
        try {
            const client = await clientsService.findById(req.params.id, req.user!.id);

            if (!client) {
                return errorResponse(res, 'NOT_FOUND', 'Klient nie znaleziony', 404);
            }

            return successResponse(res, client);
        } catch (error) {
            console.error('[Clients] FindById error:', error);
            return errorResponse(res, 'FETCH_FAILED', 'Nie udało się pobrać klienta', 500);
        }
    }

    async findAll(req: AuthenticatedRequest, res: Response) {
        try {
            const { clients, total, page, limit } = await clientsService.findAll(
                req.user!.id,
                req.query as any
            );

            return paginatedResponse(res, clients, total, page, limit);
        } catch (error) {
            console.error('[Clients] FindAll error:', error);
            return errorResponse(res, 'FETCH_FAILED', 'Nie udało się pobrać listy klientów', 500);
        }
    }

    async update(req: AuthenticatedRequest, res: Response) {
        try {
            const client = await clientsService.update(req.params.id, req.user!.id, req.body);

            if (!client) {
                return errorResponse(res, 'NOT_FOUND', 'Klient nie znaleziony', 404);
            }

            return successResponse(res, client);
        } catch (error) {
            console.error('[Clients] Update error:', error);
            return errorResponse(res, 'UPDATE_FAILED', 'Nie udało się zaktualizować klienta', 500);
        }
    }

    async delete(req: AuthenticatedRequest, res: Response) {
        try {
            const client = await clientsService.delete(req.params.id, req.user!.id);

            if (!client) {
                return errorResponse(res, 'NOT_FOUND', 'Klient nie znaleziony', 404);
            }

            return successResponse(res, { message: 'Klient usunięty' });
        } catch (error) {
            console.error('[Clients] Delete error:', error);
            return errorResponse(res, 'DELETE_FAILED', 'Nie udało się usunąć klienta', 500);
        }
    }

    async getStats(req: AuthenticatedRequest, res: Response) {
        try {
            const stats = await clientsService.getStats(req.user!.id);
            return successResponse(res, stats);
        } catch (error) {
            console.error('[Clients] Stats error:', error);
            return errorResponse(res, 'STATS_FAILED', 'Nie udało się pobrać statystyk', 500);
        }
    }
}

export const clientsController = new ClientsController();