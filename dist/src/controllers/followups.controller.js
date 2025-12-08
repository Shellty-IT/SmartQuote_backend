"use strict";
// src/controllers/followups.controller.ts
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
exports.followUpsController = void 0;
const followups_service_1 = __importDefault(require("../services/followups.service"));
const apiResponse_1 = require("../utils/apiResponse");
// Stałe do walidacji
const VALID_STATUSES = ['PENDING', 'COMPLETED', 'CANCELLED', 'OVERDUE'];
const VALID_TYPES = ['CALL', 'EMAIL', 'MEETING', 'TASK', 'REMINDER', 'OTHER'];
const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
exports.followUpsController = {
    /**
     * GET /followups
     */
    getAll(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                // Walidacja i rzutowanie typów
                const statusParam = req.query.status;
                const typeParam = req.query.type;
                const priorityParam = req.query.priority;
                const query = {
                    page: req.query.page ? parseInt(req.query.page) : 1,
                    limit: req.query.limit ? parseInt(req.query.limit) : 10,
                    search: req.query.search,
                    status: statusParam && VALID_STATUSES.includes(statusParam)
                        ? statusParam
                        : undefined,
                    type: typeParam && VALID_TYPES.includes(typeParam)
                        ? typeParam
                        : undefined,
                    priority: priorityParam && VALID_PRIORITIES.includes(priorityParam)
                        ? priorityParam
                        : undefined,
                    clientId: req.query.clientId,
                    offerId: req.query.offerId,
                    contractId: req.query.contractId,
                    dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom) : undefined,
                    dateTo: req.query.dateTo ? new Date(req.query.dateTo) : undefined,
                    sortBy: req.query.sortBy || 'dueDate',
                    sortOrder: req.query.sortOrder || 'asc',
                    overdue: req.query.overdue === 'true',
                    upcoming: req.query.upcoming ? parseInt(req.query.upcoming) : undefined,
                };
                const result = yield followups_service_1.default.findAll(userId, query);
                return (0, apiResponse_1.paginatedResponse)(res, result.data, result.pagination.total, result.pagination.page, result.pagination.limit);
            }
            catch (error) {
                next(error);
            }
        });
    },
    /**
     * GET /followups/stats
     */
    getStats(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const stats = yield followups_service_1.default.getStats(userId);
                return (0, apiResponse_1.successResponse)(res, stats);
            }
            catch (error) {
                next(error);
            }
        });
    },
    /**
     * GET /followups/upcoming
     */
    getUpcoming(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const days = req.query.days ? parseInt(req.query.days) : 7;
                const limit = req.query.limit ? parseInt(req.query.limit) : 5;
                const followUps = yield followups_service_1.default.getUpcoming(userId, days, limit);
                return (0, apiResponse_1.successResponse)(res, followUps);
            }
            catch (error) {
                next(error);
            }
        });
    },
    /**
     * GET /followups/overdue
     */
    getOverdue(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
                const followUps = yield followups_service_1.default.getOverdue(userId, limit);
                return (0, apiResponse_1.successResponse)(res, followUps);
            }
            catch (error) {
                next(error);
            }
        });
    },
    /**
     * GET /followups/:id
     */
    getById(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const { id } = req.params;
                const followUp = yield followups_service_1.default.findById(id, userId);
                if (!followUp) {
                    return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Nie znaleziono follow-up', 404);
                }
                return (0, apiResponse_1.successResponse)(res, followUp);
            }
            catch (error) {
                next(error);
            }
        });
    },
    /**
     * POST /followups
     */
    create(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const data = Object.assign(Object.assign({}, req.body), { dueDate: new Date(req.body.dueDate) });
                const followUp = yield followups_service_1.default.create(userId, data);
                return (0, apiResponse_1.successResponse)(res, followUp, 201);
            }
            catch (error) {
                if (error instanceof Error) {
                    if (error.message.includes('Nie znaleziono')) {
                        return (0, apiResponse_1.errorResponse)(res, 'BAD_REQUEST', error.message, 400);
                    }
                }
                next(error);
            }
        });
    },
    /**
     * PUT /followups/:id
     */
    update(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const { id } = req.params;
                const data = Object.assign({}, req.body);
                if (data.dueDate) {
                    data.dueDate = new Date(data.dueDate);
                }
                const followUp = yield followups_service_1.default.update(id, userId, data);
                return (0, apiResponse_1.successResponse)(res, followUp);
            }
            catch (error) {
                if (error instanceof Error && error.message === 'Nie znaleziono follow-up') {
                    return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', error.message, 404);
                }
                next(error);
            }
        });
    },
    /**
     * PATCH /followups/:id/status
     */
    updateStatus(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const { id } = req.params;
                const { status, notes } = req.body;
                const followUp = yield followups_service_1.default.updateStatus(id, userId, status, notes);
                return (0, apiResponse_1.successResponse)(res, followUp);
            }
            catch (error) {
                if (error instanceof Error && error.message === 'Nie znaleziono follow-up') {
                    return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', error.message, 404);
                }
                next(error);
            }
        });
    },
    /**
     * PATCH /followups/:id/complete
     */
    complete(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = req.user.id;
                const { id } = req.params;
                const notes = (_a = req.body) === null || _a === void 0 ? void 0 : _a.notes;
                const followUp = yield followups_service_1.default.complete(id, userId, notes);
                return (0, apiResponse_1.successResponse)(res, followUp);
            }
            catch (error) {
                if (error instanceof Error && error.message === 'Nie znaleziono follow-up') {
                    return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', error.message, 404);
                }
                next(error);
            }
        });
    },
    /**
     * DELETE /followups/:id
     */
    delete(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const { id } = req.params;
                yield followups_service_1.default.delete(id, userId);
                return (0, apiResponse_1.successResponse)(res, null);
            }
            catch (error) {
                if (error instanceof Error && error.message === 'Nie znaleziono follow-up') {
                    return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', error.message, 404);
                }
                next(error);
            }
        });
    },
    /**
     * DELETE /followups/bulk
     */
    deleteMany(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const { ids } = req.body;
                if (!ids || !Array.isArray(ids) || ids.length === 0) {
                    return (0, apiResponse_1.errorResponse)(res, 'BAD_REQUEST', 'Brak ID do usunięcia', 400);
                }
                const count = yield followups_service_1.default.deleteMany(ids, userId);
                return (0, apiResponse_1.successResponse)(res, { deleted: count });
            }
            catch (error) {
                next(error);
            }
        });
    },
    /**
     * GET /followups/client/:clientId
     */
    getByClient(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const { clientId } = req.params;
                const followUps = yield followups_service_1.default.findByClientId(clientId, userId);
                return (0, apiResponse_1.successResponse)(res, followUps);
            }
            catch (error) {
                next(error);
            }
        });
    },
    /**
     * GET /followups/offer/:offerId
     */
    getByOffer(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const { offerId } = req.params;
                const followUps = yield followups_service_1.default.findByOfferId(offerId, userId);
                return (0, apiResponse_1.successResponse)(res, followUps);
            }
            catch (error) {
                next(error);
            }
        });
    },
    /**
     * GET /followups/contract/:contractId
     */
    getByContract(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const { contractId } = req.params;
                const followUps = yield followups_service_1.default.findByContractId(contractId, userId);
                return (0, apiResponse_1.successResponse)(res, followUps);
            }
            catch (error) {
                next(error);
            }
        });
    },
    /**
     * POST /followups/mark-overdue
     */
    markOverdue(_req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const count = yield followups_service_1.default.markOverdueFollowUps();
                return (0, apiResponse_1.successResponse)(res, { updated: count });
            }
            catch (error) {
                next(error);
            }
        });
    },
};
exports.default = exports.followUpsController;
