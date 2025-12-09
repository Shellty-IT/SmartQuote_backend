"use strict";
// smartquote_backend/src/controllers/contracts.controller.ts
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
async function getContracts(req, res, next) {
    try {
        const userId = req.user.id;
        const { page, limit, status, clientId, search } = req.query;
        const pageNum = page ? parseInt(page) : 1;
        const limitNum = limit ? parseInt(limit) : 10;
        const result = await contracts_service_1.default.getContracts({
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
}
// GET /api/contracts/stats
async function getContractsStats(req, res, next) {
    try {
        const userId = req.user.id;
        const stats = await contracts_service_1.default.getContractsStats(userId);
        return (0, apiResponse_1.successResponse)(res, stats);
    }
    catch (error) {
        next(error);
    }
}
// GET /api/contracts/:id
async function getContractById(req, res, next) {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const contract = await contracts_service_1.default.getContractById(id, userId);
        if (!contract) {
            return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Umowa nie znaleziona', 404);
        }
        return (0, apiResponse_1.successResponse)(res, contract);
    }
    catch (error) {
        next(error);
    }
}
// GET /api/contracts/:id/pdf
async function generateContractPDF(req, res, next) {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        // Pobierz umowę z wszystkimi relacjami + companyInfo
        const contract = await prisma_1.default.contract.findFirst({
            where: { id, userId },
            include: {
                client: true,
                items: { orderBy: { position: 'asc' } },
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        phone: true,
                        companyInfo: {
                            select: {
                                name: true,
                                nip: true,
                                address: true,
                                city: true,
                                postalCode: true,
                                phone: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });
        if (!contract) {
            return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Umowa nie znaleziona', 404);
        }
        // Przekształć dane dla PDF service (dodaj company z companyInfo)
        const pdfContract = {
            ...contract,
            user: {
                ...contract.user,
                company: contract.user.companyInfo?.name || null,
                phone: contract.user.companyInfo?.phone || contract.user.phone,
            },
        };
        // Generuj PDF
        const pdfBuffer = await pdf_service_1.pdfService.generateContractPDF(pdfContract);
        // Ustaw nagłówki odpowiedzi
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="umowa-${contract.number.replace(/\//g, '-')}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        return res.send(pdfBuffer);
    }
    catch (error) {
        next(error);
    }
}
// POST /api/contracts
async function createContract(req, res, next) {
    try {
        const userId = req.user.id;
        const contract = await contracts_service_1.default.createContract(userId, req.body);
        return (0, apiResponse_1.successResponse)(res, contract, 201);
    }
    catch (error) {
        next(error);
    }
}
// POST /api/contracts/from-offer/:offerId
async function createContractFromOffer(req, res, next) {
    try {
        const userId = req.user.id;
        const { offerId } = req.params;
        const contract = await contracts_service_1.default.createContractFromOffer(offerId, userId);
        if (!contract) {
            return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Oferta nie znaleziona', 404);
        }
        return (0, apiResponse_1.successResponse)(res, contract, 201);
    }
    catch (error) {
        next(error);
    }
}
// PUT /api/contracts/:id
async function updateContract(req, res, next) {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const contract = await contracts_service_1.default.updateContract(id, userId, req.body);
        if (!contract) {
            return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Umowa nie znaleziona', 404);
        }
        return (0, apiResponse_1.successResponse)(res, contract);
    }
    catch (error) {
        next(error);
    }
}
// PUT /api/contracts/:id/status
async function updateContractStatus(req, res, next) {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { status } = req.body;
        const updateData = { status };
        // Jeśli status zmienia się na ACTIVE, ustaw datę podpisania
        if (status === 'ACTIVE') {
            updateData.signedAt = new Date();
        }
        const contract = await contracts_service_1.default.updateContract(id, userId, updateData);
        if (!contract) {
            return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Umowa nie znaleziona', 404);
        }
        return (0, apiResponse_1.successResponse)(res, contract);
    }
    catch (error) {
        next(error);
    }
}
// DELETE /api/contracts/:id
async function deleteContract(req, res, next) {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const deleted = await contracts_service_1.default.deleteContract(id, userId);
        if (!deleted) {
            return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Umowa nie znaleziona', 404);
        }
        return (0, apiResponse_1.successResponse)(res, { message: 'Umowa została usunięta' });
    }
    catch (error) {
        next(error);
    }
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
