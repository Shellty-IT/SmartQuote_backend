"use strict";
// src/controllers/ksef-bridge.controller.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.ksefBridgeController = exports.KsefBridgeController = void 0;
const ksef_bridge_service_1 = require("../services/ksef-bridge.service");
const ksef_bridge_validator_1 = require("../validators/ksef-bridge.validator");
const apiResponse_1 = require("../utils/apiResponse");
class KsefBridgeController {
    async getPreview(req, res) {
        try {
            const data = await ksef_bridge_service_1.ksefBridgeService.getPreviewData(req.params.offerId, req.user.id);
            if (!data) {
                return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Oferta nie znaleziona lub nie ma statusu ACCEPTED', 404);
            }
            return (0, apiResponse_1.successResponse)(res, data);
        }
        catch (error) {
            console.error('[KsefBridge] Preview error:', error);
            return (0, apiResponse_1.errorResponse)(res, 'PREVIEW_FAILED', 'Nie udało się pobrać danych podglądu', 500);
        }
    }
    async send(req, res) {
        try {
            const parsed = ksef_bridge_validator_1.ksefSendSchema.safeParse(req.body);
            if (!parsed.success) {
                const firstError = parsed.error.errors[0];
                return (0, apiResponse_1.errorResponse)(res, 'VALIDATION_ERROR', firstError.message, 400);
            }
            const { offerId, issueDate, dueDate } = parsed.data;
            const result = await ksef_bridge_service_1.ksefBridgeService.sendToKsefMaster(offerId, req.user.id, issueDate, dueDate);
            return (0, apiResponse_1.successResponse)(res, result);
        }
        catch (error) {
            console.error('[KsefBridge] Send error:', error);
            if (error instanceof Error) {
                const errorMap = {
                    OFFER_NOT_FOUND: {
                        code: 'NOT_FOUND',
                        message: 'Oferta nie znaleziona lub nie ma statusu ACCEPTED',
                        status: 404,
                    },
                    ALREADY_SENT: {
                        code: 'ALREADY_SENT',
                        message: 'Faktura została już przesłana do KSeF Master',
                        status: 409,
                    },
                    SELLER_NIP_MISSING: {
                        code: 'SELLER_NIP_MISSING',
                        message: 'Brak NIP sprzedawcy — uzupełnij dane firmy w ustawieniach',
                        status: 400,
                    },
                    BUYER_NIP_MISSING: {
                        code: 'BUYER_NIP_MISSING',
                        message: 'Brak NIP nabywcy — uzupełnij dane klienta',
                        status: 400,
                    },
                    NO_ITEMS: {
                        code: 'NO_ITEMS',
                        message: 'Oferta nie zawiera zaznaczonych pozycji',
                        status: 400,
                    },
                    KSEF_NOT_CONFIGURED: {
                        code: 'KSEF_NOT_CONFIGURED',
                        message: 'Integracja KSeF Master nie jest skonfigurowana',
                        status: 400,
                    },
                };
                const mapped = errorMap[error.message];
                if (mapped) {
                    return (0, apiResponse_1.errorResponse)(res, mapped.code, mapped.message, mapped.status);
                }
            }
            return (0, apiResponse_1.errorResponse)(res, 'SEND_FAILED', 'Nie udało się przesłać danych do KSeF Master', 500);
        }
    }
    async webhook(req, res) {
        try {
            const apiKey = req.headers['x-api-key'];
            const expectedKey = process.env.KSEF_MASTER_API_KEY;
            if (!expectedKey || apiKey !== expectedKey) {
                return (0, apiResponse_1.errorResponse)(res, 'UNAUTHORIZED', 'Invalid API key', 401);
            }
            const parsed = ksef_bridge_validator_1.ksefWebhookSchema.safeParse(req.body);
            if (!parsed.success) {
                const firstError = parsed.error.errors[0];
                return (0, apiResponse_1.errorResponse)(res, 'VALIDATION_ERROR', firstError.message, 400);
            }
            const { smartQuoteId, action, externalId } = parsed.data;
            const result = await ksef_bridge_service_1.ksefBridgeService.handleWebhook(smartQuoteId, action, externalId);
            return (0, apiResponse_1.successResponse)(res, result);
        }
        catch (error) {
            console.error('[KsefBridge] Webhook error:', error);
            if (error instanceof Error && error.message === 'OFFER_NOT_FOUND') {
                return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Oferta nie znaleziona', 404);
            }
            return (0, apiResponse_1.errorResponse)(res, 'WEBHOOK_FAILED', 'Nie udało się przetworzyć webhooka', 500);
        }
    }
}
exports.KsefBridgeController = KsefBridgeController;
exports.ksefBridgeController = new KsefBridgeController();
