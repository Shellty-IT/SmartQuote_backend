"use strict";
// smartquote_backend/src/controllers/contracts.controller.ts
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
exports.getContracts = getContracts;
exports.getContractsStats = getContractsStats;
exports.getContractById = getContractById;
exports.generateContractPDF = generateContractPDF;
exports.createContract = createContract;
exports.createContractFromOffer = createContractFromOffer;
exports.updateContract = updateContract;
exports.updateContractStatus = updateContractStatus;
exports.deleteContract = deleteContract;
require("../types");
const contracts_service_1 = __importDefault(require("../services/contracts.service"));
const pdf_service_1 = require("../services/pdf.service");
const prisma_1 = __importDefault(require("../lib/prisma"));
const apiResponse_1 = require("../utils/apiResponse");
// GET /api/contracts
function getContracts(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const userId = req.user.id;
            const { page, limit, status, clientId, search } = req.query;
            const pageNum = page ? parseInt(page) : 1;
            const limitNum = limit ? parseInt(limit) : 10;
            const result = yield contracts_service_1.default.getContracts({
                userId,
                page: pageNum,
                limit: limitNum,
                status: status,
                clientId: clientId,
                search: search,
            });
            return (0, apiResponse_1.paginatedResponse)(res, result.data, result.pagination.total, result.pagination.page, result.pagination.limit);
        }
        catch (error) {
            next(error);
        }
    });
}
// GET /api/contracts/stats
function getContractsStats(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const userId = req.user.id;
            const stats = yield contracts_service_1.default.getContractsStats(userId);
            return (0, apiResponse_1.successResponse)(res, stats);
        }
        catch (error) {
            next(error);
        }
    });
}
// GET /api/contracts/:id
function getContractById(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const contract = yield contracts_service_1.default.getContractById(id, userId);
            if (!contract) {
                return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Umowa nie znaleziona', 404);
            }
            return (0, apiResponse_1.successResponse)(res, contract);
        }
        catch (error) {
            next(error);
        }
    });
}
// GET /api/contracts/:id/pdf
function generateContractPDF(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            // Pobierz umowę z wszystkimi relacjami
            const contract = yield prisma_1.default.contract.findFirst({
                where: { id, userId },
                include: {
                    client: true,
                    items: { orderBy: { position: 'asc' } },
                    user: true,
                },
            });
            if (!contract) {
                return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Umowa nie znaleziona', 404);
            }
            // Generuj PDF
            const pdfBuffer = yield pdf_service_1.pdfService.generateContractPDF(contract);
            // Ustaw nagłówki odpowiedzi
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="umowa-${contract.number.replace(/\//g, '-')}.pdf"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            return res.send(pdfBuffer);
        }
        catch (error) {
            next(error);
        }
    });
}
// POST /api/contracts
function createContract(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const userId = req.user.id;
            const contract = yield contracts_service_1.default.createContract(userId, req.body);
            return (0, apiResponse_1.successResponse)(res, contract, 201);
        }
        catch (error) {
            next(error);
        }
    });
}
// POST /api/contracts/from-offer/:offerId
function createContractFromOffer(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const userId = req.user.id;
            const { offerId } = req.params;
            const contract = yield contracts_service_1.default.createContractFromOffer(offerId, userId);
            if (!contract) {
                return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Oferta nie znaleziona', 404);
            }
            return (0, apiResponse_1.successResponse)(res, contract, 201);
        }
        catch (error) {
            next(error);
        }
    });
}
// PUT /api/contracts/:id
function updateContract(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const contract = yield contracts_service_1.default.updateContract(id, userId, req.body);
            if (!contract) {
                return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Umowa nie znaleziona', 404);
            }
            return (0, apiResponse_1.successResponse)(res, contract);
        }
        catch (error) {
            next(error);
        }
    });
}
// PUT /api/contracts/:id/status
function updateContractStatus(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const { status } = req.body;
            const updateData = { status };
            // Jeśli status zmienia się na ACTIVE, ustaw datę podpisania
            if (status === 'ACTIVE') {
                updateData.signedAt = new Date();
            }
            const contract = yield contracts_service_1.default.updateContract(id, userId, updateData);
            if (!contract) {
                return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Umowa nie znaleziona', 404);
            }
            return (0, apiResponse_1.successResponse)(res, contract);
        }
        catch (error) {
            next(error);
        }
    });
}
// DELETE /api/contracts/:id
function deleteContract(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const deleted = yield contracts_service_1.default.deleteContract(id, userId);
            if (!deleted) {
                return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Umowa nie znaleziona', 404);
            }
            return (0, apiResponse_1.successResponse)(res, { message: 'Umowa została usunięta' });
        }
        catch (error) {
            next(error);
        }
    });
}
exports.default = {
    getContracts,
    getContractsStats,
    getContractById,
    generateContractPDF,
    createContract,
    createContractFromOffer,
    updateContract,
    updateContractStatus,
    deleteContract,
};
