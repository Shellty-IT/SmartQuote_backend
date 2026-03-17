"use strict";
// smartquote_backend/src/controllers/offers.controller.ts
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
    async create(req, res) {
        try {
            const offer = await offers_service_1.offersService.create(req.user.id, req.body);
            return (0, apiResponse_1.successResponse)(res, offer, 201);
        }
        catch (error) {
            console.error('[Offers] Create error:', error);
            if (error instanceof Error && error.message === 'CLIENT_NOT_FOUND') {
                return (0, apiResponse_1.errorResponse)(res, 'CLIENT_NOT_FOUND', 'Klient nie znaleziony', 404);
            }
            return (0, apiResponse_1.errorResponse)(res, 'CREATE_FAILED', 'Nie udało się utworzyć oferty', 500);
        }
    }
    async findById(req, res) {
        try {
            const offer = await offers_service_1.offersService.findById(req.params.id, req.user.id);
            if (!offer) {
                return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Oferta nie znaleziona', 404);
            }
            return (0, apiResponse_1.successResponse)(res, offer);
        }
        catch (error) {
            console.error('[Offers] FindById error:', error);
            return (0, apiResponse_1.errorResponse)(res, 'FETCH_FAILED', 'Nie udało się pobrać oferty', 500);
        }
    }
    async findAll(req, res) {
        try {
            const { offers, total, page, limit } = await offers_service_1.offersService.findAll(req.user.id, req.query);
            return (0, apiResponse_1.paginatedResponse)(res, offers, total, page, limit);
        }
        catch (error) {
            console.error('[Offers] FindAll error:', error);
            return (0, apiResponse_1.errorResponse)(res, 'FETCH_FAILED', 'Nie udało się pobrać listy ofert', 500);
        }
    }
    async update(req, res) {
        try {
            const offer = await offers_service_1.offersService.update(req.params.id, req.user.id, req.body);
            if (!offer) {
                return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Oferta nie znaleziona', 404);
            }
            return (0, apiResponse_1.successResponse)(res, offer);
        }
        catch (error) {
            console.error('[Offers] Update error:', error);
            return (0, apiResponse_1.errorResponse)(res, 'UPDATE_FAILED', 'Nie udało się zaktualizować oferty', 500);
        }
    }
    async delete(req, res) {
        try {
            const offer = await offers_service_1.offersService.delete(req.params.id, req.user.id);
            if (!offer) {
                return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Oferta nie znaleziona', 404);
            }
            return (0, apiResponse_1.successResponse)(res, { message: 'Oferta usunięta' });
        }
        catch (error) {
            console.error('[Offers] Delete error:', error);
            return (0, apiResponse_1.errorResponse)(res, 'DELETE_FAILED', 'Nie udało się usunąć oferty', 500);
        }
    }
    async getStats(req, res) {
        try {
            const stats = await offers_service_1.offersService.getStats(req.user.id);
            return (0, apiResponse_1.successResponse)(res, stats);
        }
        catch (error) {
            console.error('[Offers] Stats error:', error);
            return (0, apiResponse_1.errorResponse)(res, 'STATS_FAILED', 'Nie udało się pobrać statystyk', 500);
        }
    }
    async duplicate(req, res) {
        try {
            const offer = await offers_service_1.offersService.duplicate(req.params.id, req.user.id);
            if (!offer) {
                return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Oferta nie znaleziona', 404);
            }
            return (0, apiResponse_1.successResponse)(res, offer, 201);
        }
        catch (error) {
            console.error('[Offers] Duplicate error:', error);
            return (0, apiResponse_1.errorResponse)(res, 'DUPLICATE_FAILED', 'Nie udało się skopiować oferty', 500);
        }
    }
    async generatePDF(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const offer = await prisma_1.default.offer.findFirst({
                where: { id, userId },
                include: {
                    client: true,
                    items: {
                        orderBy: { position: 'asc' },
                    },
                    acceptanceLog: true,
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
            if (!offer) {
                return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Oferta nie znaleziona', 404);
            }
            const pdfOffer = {
                ...offer,
                user: {
                    ...offer.user,
                    company: offer.user.companyInfo?.name || null,
                    phone: offer.user.companyInfo?.phone || offer.user.phone,
                },
            };
            const pdfBuffer = await pdf_service_1.pdfService.generateOfferPDF(pdfOffer);
            const filename = `Oferta_${offer.number.replace(/\//g, '-')}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            return res.send(pdfBuffer);
        }
        catch (error) {
            console.error('[Offers] GeneratePDF error:', error);
            return (0, apiResponse_1.errorResponse)(res, 'PDF_FAILED', 'Nie udało się wygenerować PDF', 500);
        }
    }
    async publish(req, res) {
        try {
            const result = await offers_service_1.offersService.publishOffer(req.params.id, req.user.id);
            if (!result) {
                return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Oferta nie znaleziona', 404);
            }
            return (0, apiResponse_1.successResponse)(res, result);
        }
        catch (error) {
            console.error('[Offers] Publish error:', error);
            return (0, apiResponse_1.errorResponse)(res, 'PUBLISH_FAILED', 'Nie udało się opublikować oferty', 500);
        }
    }
    async unpublish(req, res) {
        try {
            const result = await offers_service_1.offersService.unpublishOffer(req.params.id, req.user.id);
            if (!result) {
                return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Oferta nie znaleziona', 404);
            }
            return (0, apiResponse_1.successResponse)(res, { unpublished: true });
        }
        catch (error) {
            console.error('[Offers] Unpublish error:', error);
            return (0, apiResponse_1.errorResponse)(res, 'UNPUBLISH_FAILED', 'Nie udało się dezaktywować linku', 500);
        }
    }
    async getAnalytics(req, res) {
        try {
            const analytics = await offers_service_1.offersService.getOfferAnalytics(req.params.id, req.user.id);
            if (!analytics) {
                return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Oferta nie znaleziona', 404);
            }
            return (0, apiResponse_1.successResponse)(res, analytics);
        }
        catch (error) {
            console.error('[Offers] Analytics error:', error);
            return (0, apiResponse_1.errorResponse)(res, 'ANALYTICS_FAILED', 'Nie udało się pobrać analityki', 500);
        }
    }
    async getComments(req, res) {
        try {
            const comments = await offers_service_1.offersService.getOfferComments(req.params.id, req.user.id);
            if (comments === null) {
                return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Oferta nie znaleziona', 404);
            }
            return (0, apiResponse_1.successResponse)(res, comments);
        }
        catch (error) {
            console.error('[Offers] GetComments error:', error);
            return (0, apiResponse_1.errorResponse)(res, 'FETCH_FAILED', 'Nie udało się pobrać komentarzy', 500);
        }
    }
    async addComment(req, res) {
        try {
            const { content } = req.body;
            const comment = await offers_service_1.offersService.addSellerComment(req.params.id, req.user.id, content);
            if (!comment) {
                return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Oferta nie znaleziona', 404);
            }
            return (0, apiResponse_1.successResponse)(res, comment, 201);
        }
        catch (error) {
            console.error('[Offers] AddComment error:', error);
            return (0, apiResponse_1.errorResponse)(res, 'COMMENT_FAILED', 'Nie udało się dodać komentarza', 500);
        }
    }
    async sendToClient(req, res) {
        try {
            const result = await offers_service_1.offersService.sendOfferToClient(req.params.id, req.user.id);
            return (0, apiResponse_1.successResponse)(res, result);
        }
        catch (error) {
            console.error('[Offers] SendToClient error:', error);
            if (error instanceof Error) {
                const errorMap = {
                    OFFER_NOT_FOUND: { code: 'NOT_FOUND', message: 'Oferta nie znaleziona', status: 404 },
                    CLIENT_NO_EMAIL: { code: 'CLIENT_NO_EMAIL', message: 'Klient nie ma podanego adresu email', status: 400 },
                    SMTP_NOT_CONFIGURED: { code: 'SMTP_NOT_CONFIGURED', message: 'Skonfiguruj skrzynkę pocztową w ustawieniach, aby wysyłać maile', status: 400 },
                    PUBLISH_FAILED: { code: 'PUBLISH_FAILED', message: 'Nie udało się opublikować oferty', status: 500 },
                    EMAIL_SEND_FAILED: { code: 'EMAIL_SEND_FAILED', message: 'Nie udało się wysłać maila. Sprawdź konfigurację SMTP', status: 500 },
                };
                const mapped = errorMap[error.message];
                if (mapped) {
                    return (0, apiResponse_1.errorResponse)(res, mapped.code, mapped.message, mapped.status);
                }
            }
            return (0, apiResponse_1.errorResponse)(res, 'SEND_FAILED', 'Nie udało się wysłać oferty do klienta', 500);
        }
    }
}
exports.OffersController = OffersController;
exports.offersController = new OffersController();
