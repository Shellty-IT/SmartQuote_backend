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
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientsController = exports.ClientsController = void 0;
const clients_service_1 = require("../services/clients.service");
const apiResponse_1 = require("../utils/apiResponse");
class ClientsController {
    create(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const client = yield clients_service_1.clientsService.create(req.user.id, req.body);
                return (0, apiResponse_1.successResponse)(res, client, 201);
            }
            catch (error) {
                console.error('[Clients] Create error:', error);
                return (0, apiResponse_1.errorResponse)(res, 'CREATE_FAILED', 'Nie udało się utworzyć klienta', 500);
            }
        });
    }
    findById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const client = yield clients_service_1.clientsService.findById(req.params.id, req.user.id);
                if (!client) {
                    return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Klient nie znaleziony', 404);
                }
                return (0, apiResponse_1.successResponse)(res, client);
            }
            catch (error) {
                console.error('[Clients] FindById error:', error);
                return (0, apiResponse_1.errorResponse)(res, 'FETCH_FAILED', 'Nie udało się pobrać klienta', 500);
            }
        });
    }
    findAll(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { clients, total, page, limit } = yield clients_service_1.clientsService.findAll(req.user.id, req.query);
                return (0, apiResponse_1.paginatedResponse)(res, clients, total, page, limit);
            }
            catch (error) {
                console.error('[Clients] FindAll error:', error);
                return (0, apiResponse_1.errorResponse)(res, 'FETCH_FAILED', 'Nie udało się pobrać listy klientów', 500);
            }
        });
    }
    update(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const client = yield clients_service_1.clientsService.update(req.params.id, req.user.id, req.body);
                if (!client) {
                    return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Klient nie znaleziony', 404);
                }
                return (0, apiResponse_1.successResponse)(res, client);
            }
            catch (error) {
                console.error('[Clients] Update error:', error);
                return (0, apiResponse_1.errorResponse)(res, 'UPDATE_FAILED', 'Nie udało się zaktualizować klienta', 500);
            }
        });
    }
    delete(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const client = yield clients_service_1.clientsService.delete(req.params.id, req.user.id);
                if (!client) {
                    return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Klient nie znaleziony', 404);
                }
                return (0, apiResponse_1.successResponse)(res, { message: 'Klient usunięty' });
            }
            catch (error) {
                console.error('[Clients] Delete error:', error);
                return (0, apiResponse_1.errorResponse)(res, 'DELETE_FAILED', 'Nie udało się usunąć klienta', 500);
            }
        });
    }
    getStats(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const stats = yield clients_service_1.clientsService.getStats(req.user.id);
                return (0, apiResponse_1.successResponse)(res, stats);
            }
            catch (error) {
                console.error('[Clients] Stats error:', error);
                return (0, apiResponse_1.errorResponse)(res, 'STATS_FAILED', 'Nie udało się pobrać statystyk', 500);
            }
        });
    }
}
exports.ClientsController = ClientsController;
exports.clientsController = new ClientsController();
