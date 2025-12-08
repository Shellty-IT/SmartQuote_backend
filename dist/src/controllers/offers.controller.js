"use strict";
// backend/src/controllers/offers.controller.ts
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
exports.offersController = exports.OffersController = void 0;
const offers_service_1 = require("../services/offers.service");
const pdf_service_1 = require("../services/pdf.service");
const apiResponse_1 = require("../utils/apiResponse");
const prisma_1 = __importDefault(require("../lib/prisma"));
class OffersController {
    create(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const offer = yield offers_service_1.offersService.create(req.user.id, req.body);
                return (0, apiResponse_1.successResponse)(res, offer, 201);
            }
            catch (error) {
                console.error('[Offers] Create error:', error);
                if (error.message === 'CLIENT_NOT_FOUND') {
                    return (0, apiResponse_1.errorResponse)(res, 'CLIENT_NOT_FOUND', 'Klient nie znaleziony', 404);
                }
                return (0, apiResponse_1.errorResponse)(res, 'CREATE_FAILED', 'Nie udało się utworzyć oferty', 500);
            }
        });
    }
    findById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const offer = yield offers_service_1.offersService.findById(req.params.id, req.user.id);
                if (!offer) {
                    return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Oferta nie znaleziona', 404);
                }
                return (0, apiResponse_1.successResponse)(res, offer);
            }
            catch (error) {
                console.error('[Offers] FindById error:', error);
                return (0, apiResponse_1.errorResponse)(res, 'FETCH_FAILED', 'Nie udało się pobrać oferty', 500);
            }
        });
    }
    findAll(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { offers, total, page, limit } = yield offers_service_1.offersService.findAll(req.user.id, req.query);
                return (0, apiResponse_1.paginatedResponse)(res, offers, total, page, limit);
            }
            catch (error) {
                console.error('[Offers] FindAll error:', error);
                return (0, apiResponse_1.errorResponse)(res, 'FETCH_FAILED', 'Nie udało się pobrać listy ofert', 500);
            }
        });
    }
    update(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const offer = yield offers_service_1.offersService.update(req.params.id, req.user.id, req.body);
                if (!offer) {
                    return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Oferta nie znaleziona', 404);
                }
                return (0, apiResponse_1.successResponse)(res, offer);
            }
            catch (error) {
                console.error('[Offers] Update error:', error);
                return (0, apiResponse_1.errorResponse)(res, 'UPDATE_FAILED', 'Nie udało się zaktualizować oferty', 500);
            }
        });
    }
    delete(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const offer = yield offers_service_1.offersService.delete(req.params.id, req.user.id);
                if (!offer) {
                    return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Oferta nie znaleziona', 404);
                }
                return (0, apiResponse_1.successResponse)(res, { message: 'Oferta usunięta' });
            }
            catch (error) {
                console.error('[Offers] Delete error:', error);
                return (0, apiResponse_1.errorResponse)(res, 'DELETE_FAILED', 'Nie udało się usunąć oferty', 500);
            }
        });
    }
    getStats(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const stats = yield offers_service_1.offersService.getStats(req.user.id);
                return (0, apiResponse_1.successResponse)(res, stats);
            }
            catch (error) {
                console.error('[Offers] Stats error:', error);
                return (0, apiResponse_1.errorResponse)(res, 'STATS_FAILED', 'Nie udało się pobrać statystyk', 500);
            }
        });
    }
    duplicate(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const offer = yield offers_service_1.offersService.duplicate(req.params.id, req.user.id);
                if (!offer) {
                    return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Oferta nie znaleziona', 404);
                }
                return (0, apiResponse_1.successResponse)(res, offer, 201);
            }
            catch (error) {
                console.error('[Offers] Duplicate error:', error);
                return (0, apiResponse_1.errorResponse)(res, 'DUPLICATE_FAILED', 'Nie udało się skopiować oferty', 500);
            }
        });
    }
    generatePDF(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const userId = req.user.id;
                // Pobierz ofertę z wszystkimi relacjami
                const offer = yield prisma_1.default.offer.findFirst({
                    where: {
                        id,
                        userId,
                    },
                    include: {
                        client: true,
                        items: {
                            orderBy: { position: 'asc' },
                        },
                        user: {
                            select: {
                                id: true,
                                email: true,
                                name: true,
                                company: true,
                                phone: true,
                            },
                        },
                    },
                });
                if (!offer) {
                    return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Oferta nie znaleziona', 404);
                }
                // Generuj PDF
                const pdfBuffer = yield pdf_service_1.pdfService.generateOfferPDF(offer);
                // Ustaw nagłówki odpowiedzi
                const filename = `Oferta_${offer.number.replace(/\//g, '-')}.pdf`;
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                res.setHeader('Content-Length', pdfBuffer.length);
                // Wyślij PDF
                return res.send(pdfBuffer);
            }
            catch (error) {
                console.error('[Offers] GeneratePDF error:', error);
                return (0, apiResponse_1.errorResponse)(res, 'PDF_FAILED', 'Nie udało się wygenerować PDF', 500);
            }
        });
    }
}
exports.OffersController = OffersController;
exports.offersController = new OffersController();
