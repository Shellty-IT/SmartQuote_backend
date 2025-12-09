"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientsController = exports.ClientsController = void 0;
const clients_service_1 = require("../services/clients.service");
const apiResponse_1 = require("../utils/apiResponse");
class ClientsController {
    async create(req, res) {
        try {
            const client = await clients_service_1.clientsService.create(req.user.id, req.body);
            return (0, apiResponse_1.successResponse)(res, client, 201);
        }
        catch (error) {
            console.error('[Clients] Create error:', error);
            return (0, apiResponse_1.errorResponse)(res, 'CREATE_FAILED', 'Nie udało się utworzyć klienta', 500);
        }
    }
    async findById(req, res) {
        try {
            const client = await clients_service_1.clientsService.findById(req.params.id, req.user.id);
            if (!client) {
                return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Klient nie znaleziony', 404);
            }
            return (0, apiResponse_1.successResponse)(res, client);
        }
        catch (error) {
            console.error('[Clients] FindById error:', error);
            return (0, apiResponse_1.errorResponse)(res, 'FETCH_FAILED', 'Nie udało się pobrać klienta', 500);
        }
    }
    async findAll(req, res) {
        try {
            const { clients, total, page, limit } = await clients_service_1.clientsService.findAll(req.user.id, req.query);
            return (0, apiResponse_1.paginatedResponse)(res, clients, total, page, limit);
        }
        catch (error) {
            console.error('[Clients] FindAll error:', error);
            return (0, apiResponse_1.errorResponse)(res, 'FETCH_FAILED', 'Nie udało się pobrać listy klientów', 500);
        }
    }
    async update(req, res) {
        try {
            const client = await clients_service_1.clientsService.update(req.params.id, req.user.id, req.body);
            if (!client) {
                return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Klient nie znaleziony', 404);
            }
            return (0, apiResponse_1.successResponse)(res, client);
        }
        catch (error) {
            console.error('[Clients] Update error:', error);
            return (0, apiResponse_1.errorResponse)(res, 'UPDATE_FAILED', 'Nie udało się zaktualizować klienta', 500);
        }
    }
    async delete(req, res) {
        try {
            const client = await clients_service_1.clientsService.delete(req.params.id, req.user.id);
            if (!client) {
                return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Klient nie znaleziony', 404);
            }
            return (0, apiResponse_1.successResponse)(res, { message: 'Klient usunięty' });
        }
        catch (error) {
            console.error('[Clients] Delete error:', error);
            return (0, apiResponse_1.errorResponse)(res, 'DELETE_FAILED', 'Nie udało się usunąć klienta', 500);
        }
    }
    async getStats(req, res) {
        try {
            const stats = await clients_service_1.clientsService.getStats(req.user.id);
            return (0, apiResponse_1.successResponse)(res, stats);
        }
        catch (error) {
            console.error('[Clients] Stats error:', error);
            return (0, apiResponse_1.errorResponse)(res, 'STATS_FAILED', 'Nie udało się pobrać statystyk', 500);
        }
    }
}
exports.ClientsController = ClientsController;
exports.clientsController = new ClientsController();
