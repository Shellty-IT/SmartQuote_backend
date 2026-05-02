// src/controllers/ksef-bridge.controller.ts

import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { ksefBridgeService } from '../services/ksef-bridge.service';
import { ksefSendSchema, ksefWebhookSchema } from '../validators/ksef-bridge.validator';
import { successResponse, errorResponse } from '../utils/apiResponse';

export class KsefBridgeController {
    async getPreview(req: AuthenticatedRequest, res: Response) {
        try {
            const data = await ksefBridgeService.getPreviewData(req.params.offerId, req.user!.id);
            if (!data) {
                return errorResponse(res, 'NOT_FOUND', 'Oferta nie znaleziona lub nie ma statusu ACCEPTED', 404);
            }
            return successResponse(res, data);
        } catch (error: unknown) {
            console.error('[KsefBridge] Preview error:', error);
            return errorResponse(res, 'PREVIEW_FAILED', 'Nie udało się pobrać danych podglądu', 500);
        }
    }

    async send(req: AuthenticatedRequest, res: Response) {
        try {
            const parsed = ksefSendSchema.safeParse({ body: req.body, query: req.query, params: req.params });
            if (!parsed.success) {
                const firstError = parsed.error.errors[0];
                return errorResponse(res, 'VALIDATION_ERROR', firstError.message, 400);
            }

            const { offerId, issueDate, dueDate } = parsed.data.body;
            const result = await ksefBridgeService.sendToKsefMaster(offerId, req.user!.id, issueDate, dueDate);
            return successResponse(res, result);
        } catch (error: unknown) {
            console.error('[KsefBridge] Send error:', error);

            if (error instanceof Error) {
                const errorMap: Record<string, { code: string; message: string; status: number }> = {
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
                        message: 'Brak NIP sprzedawcy - uzupełnij dane firmy w ustawieniach',
                        status: 400,
                    },
                    BUYER_NIP_MISSING: {
                        code: 'BUYER_NIP_MISSING',
                        message: 'Brak NIP nabywcy - uzupełnij dane klienta',
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
                    return errorResponse(res, mapped.code, mapped.message, mapped.status);
                }
            }

            return errorResponse(res, 'SEND_FAILED', 'Nie udało się przesłać danych do KSeF Master', 500);
        }
    }

    async webhook(req: Request, res: Response) {
        try {
            const apiKey = req.headers['x-api-key'] as string;
            const expectedKey = process.env.KSEF_MASTER_API_KEY;

            if (!expectedKey || apiKey !== expectedKey) {
                return errorResponse(res, 'UNAUTHORIZED', 'Invalid API key', 401);
            }

            const parsed = ksefWebhookSchema.safeParse({ body: req.body, query: req.query, params: req.params });
            if (!parsed.success) {
                const firstError = parsed.error.errors[0];
                return errorResponse(res, 'VALIDATION_ERROR', firstError.message, 400);
            }

            const { smartQuoteId, action, externalId } = parsed.data.body;
            const result = await ksefBridgeService.handleWebhook(smartQuoteId, action, externalId);
            return successResponse(res, result);
        } catch (error: unknown) {
            console.error('[KsefBridge] Webhook error:', error);

            if (error instanceof Error && error.message === 'OFFER_NOT_FOUND') {
                return errorResponse(res, 'NOT_FOUND', 'Oferta nie znaleziona', 404);
            }

            return errorResponse(res, 'WEBHOOK_FAILED', 'Nie udało się przetworzyć webhooka', 500);
        }
    }
}

export const ksefBridgeController = new KsefBridgeController();