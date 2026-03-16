// smartquote_backend/src/controllers/publicOffer.controller.ts

import { Request, Response } from 'express';
import { publicOfferService } from '../services/publicOffer.service';
import { successResponse, errorResponse } from '../utils/apiResponse';

const ERROR_MAP: Record<string, { message: string; status: number }> = {
    NOT_FOUND: { message: 'Oferta nie została znaleziona', status: 404 },
    ALREADY_DECIDED: { message: 'Oferta została już rozpatrzona', status: 409 },
    EXPIRED: { message: 'Oferta wygasła', status: 410 },
};

function handleOfferError(res: Response, errorCode: string): Response {
    const mapped = ERROR_MAP[errorCode] || { message: 'Nieznany błąd', status: 400 };
    return errorResponse(res, errorCode, mapped.message, mapped.status);
}

export class PublicOfferController {
    async getOffer(req: Request<{ token: string }>, res: Response) {
        try {
            const token = req.params.token;
            const result = await publicOfferService.getOfferByToken(token);

            if (!result) {
                return errorResponse(res, 'OFFER_NOT_FOUND', 'Oferta nie została znaleziona lub link jest nieaktywny', 404);
            }

            return successResponse(res, result);
        } catch (error) {
            console.error('[PublicOffer] GetOffer error:', error);
            return errorResponse(res, 'INTERNAL_ERROR', 'Błąd serwera', 500);
        }
    }

    async registerView(req: Request<{ token: string }>, res: Response) {
        try {
            const token = req.params.token;
            const ipAddress =
                (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                req.socket.remoteAddress ||
                '';
            const userAgent = req.headers['user-agent'] || '';

            await publicOfferService.registerView(token, ipAddress, userAgent);

            return successResponse(res, { registered: true });
        } catch (error) {
            console.error('[PublicOffer] RegisterView error:', error);
            return errorResponse(res, 'INTERNAL_ERROR', 'Błąd serwera', 500);
        }
    }

    async acceptOffer(req: Request<{ token: string }>, res: Response) {
        try {
            const token = req.params.token;
            const { selectedItems, confirmationChecked, selectedVariant } = req.body;

            if (!confirmationChecked) {
                return errorResponse(res, 'CONFIRMATION_REQUIRED', 'Wymagane potwierdzenie akceptacji', 400);
            }

            const result = await publicOfferService.acceptOffer(token, selectedItems || [], selectedVariant);

            if ('error' in result && result.error) {
                return handleOfferError(res, result.error);
            }

            if ('data' in result) {
                return successResponse(res, result.data);
            }

            return errorResponse(res, 'UNKNOWN_ERROR', 'Nieznany błąd', 400);
        } catch (error) {
            console.error('[PublicOffer] AcceptOffer error:', error);
            return errorResponse(res, 'INTERNAL_ERROR', 'Błąd serwera', 500);
        }
    }

    async rejectOffer(req: Request<{ token: string }>, res: Response) {
        try {
            const token = req.params.token;
            const { reason } = req.body;

            const result = await publicOfferService.rejectOffer(token, reason);

            if ('error' in result && result.error) {
                return handleOfferError(res, result.error);
            }

            if ('data' in result) {
                return successResponse(res, result.data);
            }

            return errorResponse(res, 'UNKNOWN_ERROR', 'Nieznany błąd', 400);
        } catch (error) {
            console.error('[PublicOffer] RejectOffer error:', error);
            return errorResponse(res, 'INTERNAL_ERROR', 'Błąd serwera', 500);
        }
    }

    async addComment(req: Request<{ token: string }>, res: Response) {
        try {
            const token = req.params.token;
            const { content } = req.body;

            const result = await publicOfferService.addComment(token, content);

            if (!result) {
                return errorResponse(res, 'OFFER_NOT_FOUND', 'Nie można dodać komentarza', 404);
            }

            return successResponse(res, result.comment, 201);
        } catch (error) {
            console.error('[PublicOffer] AddComment error:', error);
            return errorResponse(res, 'INTERNAL_ERROR', 'Błąd serwera', 500);
        }
    }

    async trackSelection(req: Request<{ token: string }>, res: Response) {
        try {
            const token = req.params.token;
            const { items, selectedVariant } = req.body;

            await publicOfferService.trackSelection(token, items, selectedVariant);

            return successResponse(res, { tracked: true });
        } catch (error) {
            console.error('[PublicOffer] TrackSelection error:', error);
            return errorResponse(res, 'INTERNAL_ERROR', 'Błąd serwera', 500);
        }
    }
}

export const publicOfferController = new PublicOfferController();