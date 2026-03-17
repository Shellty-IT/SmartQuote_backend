"use strict";
// smartquote_backend/src/controllers/publicOffer.controller.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicOfferController = exports.PublicOfferController = void 0;
const publicOffer_service_1 = require("../services/publicOffer.service");
const apiResponse_1 = require("../utils/apiResponse");
const ERROR_MAP = {
    NOT_FOUND: { message: 'Oferta nie została znaleziona', status: 404 },
    ALREADY_DECIDED: { message: 'Oferta została już rozpatrzona', status: 409 },
    EXPIRED: { message: 'Oferta wygasła', status: 410 },
};
function handleOfferError(res, errorCode) {
    const mapped = ERROR_MAP[errorCode] || { message: 'Nieznany błąd', status: 400 };
    return (0, apiResponse_1.errorResponse)(res, errorCode, mapped.message, mapped.status);
}
function extractIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.socket.remoteAddress
        || 'unknown';
}
class PublicOfferController {
    async getOffer(req, res) {
        try {
            const token = req.params.token;
            const result = await publicOffer_service_1.publicOfferService.getOfferByToken(token);
            if (!result) {
                return (0, apiResponse_1.errorResponse)(res, 'OFFER_NOT_FOUND', 'Oferta nie została znaleziona lub link jest nieaktywny', 404);
            }
            return (0, apiResponse_1.successResponse)(res, result);
        }
        catch (error) {
            console.error('[PublicOffer] GetOffer error:', error);
            return (0, apiResponse_1.errorResponse)(res, 'INTERNAL_ERROR', 'Błąd serwera', 500);
        }
    }
    async registerView(req, res) {
        try {
            const token = req.params.token;
            const ipAddress = extractIp(req);
            const userAgent = req.headers['user-agent'] || '';
            await publicOffer_service_1.publicOfferService.registerView(token, ipAddress, userAgent);
            return (0, apiResponse_1.successResponse)(res, { registered: true });
        }
        catch (error) {
            console.error('[PublicOffer] RegisterView error:', error);
            return (0, apiResponse_1.errorResponse)(res, 'INTERNAL_ERROR', 'Błąd serwera', 500);
        }
    }
    async acceptOffer(req, res) {
        try {
            const token = req.params.token;
            const { selectedItems, confirmationChecked, selectedVariant, clientName, clientEmail } = req.body;
            if (!confirmationChecked) {
                return (0, apiResponse_1.errorResponse)(res, 'CONFIRMATION_REQUIRED', 'Wymagane potwierdzenie akceptacji', 400);
            }
            const ipAddress = extractIp(req);
            const userAgent = req.headers['user-agent'] || '';
            const result = await publicOffer_service_1.publicOfferService.acceptOffer({
                token,
                selectedItems: selectedItems || [],
                selectedVariant,
                ipAddress,
                userAgent,
                clientName,
                clientEmail,
            });
            if ('error' in result && result.error) {
                return handleOfferError(res, result.error);
            }
            if ('data' in result) {
                return (0, apiResponse_1.successResponse)(res, result.data);
            }
            return (0, apiResponse_1.errorResponse)(res, 'UNKNOWN_ERROR', 'Nieznany błąd', 400);
        }
        catch (error) {
            console.error('[PublicOffer] AcceptOffer error:', error);
            return (0, apiResponse_1.errorResponse)(res, 'INTERNAL_ERROR', 'Błąd serwera', 500);
        }
    }
    async rejectOffer(req, res) {
        try {
            const token = req.params.token;
            const { reason } = req.body;
            const result = await publicOffer_service_1.publicOfferService.rejectOffer(token, reason);
            if ('error' in result && result.error) {
                return handleOfferError(res, result.error);
            }
            if ('data' in result) {
                return (0, apiResponse_1.successResponse)(res, result.data);
            }
            return (0, apiResponse_1.errorResponse)(res, 'UNKNOWN_ERROR', 'Nieznany błąd', 400);
        }
        catch (error) {
            console.error('[PublicOffer] RejectOffer error:', error);
            return (0, apiResponse_1.errorResponse)(res, 'INTERNAL_ERROR', 'Błąd serwera', 500);
        }
    }
    async addComment(req, res) {
        try {
            const token = req.params.token;
            const { content } = req.body;
            const result = await publicOffer_service_1.publicOfferService.addComment(token, content);
            if (!result) {
                return (0, apiResponse_1.errorResponse)(res, 'OFFER_NOT_FOUND', 'Nie można dodać komentarza', 404);
            }
            return (0, apiResponse_1.successResponse)(res, result.comment, 201);
        }
        catch (error) {
            console.error('[PublicOffer] AddComment error:', error);
            return (0, apiResponse_1.errorResponse)(res, 'INTERNAL_ERROR', 'Błąd serwera', 500);
        }
    }
    async trackSelection(req, res) {
        try {
            const token = req.params.token;
            const { items, selectedVariant } = req.body;
            await publicOffer_service_1.publicOfferService.trackSelection(token, items, selectedVariant);
            return (0, apiResponse_1.successResponse)(res, { tracked: true });
        }
        catch (error) {
            console.error('[PublicOffer] TrackSelection error:', error);
            return (0, apiResponse_1.errorResponse)(res, 'INTERNAL_ERROR', 'Błąd serwera', 500);
        }
    }
}
exports.PublicOfferController = PublicOfferController;
exports.publicOfferController = new PublicOfferController();
