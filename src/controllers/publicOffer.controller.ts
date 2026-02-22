// smartquote_backend/src/controllers/publicOffer.controller.ts

import { Request, Response } from 'express';
import { publicOfferService } from '../services/publicOffer.service';
import { successResponse, errorResponse } from '../utils/apiResponse';

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
            const { selectedItems, confirmationChecked } = req.body;

            if (!confirmationChecked) {
                return errorResponse(res, 'CONFIRMATION_REQUIRED', 'Wymagane potwierdzenie akceptacji', 400);
            }

            const result = await publicOfferService.acceptOffer(token, selectedItems || []);

            if ('error' in result) {
                if (result.error === 'NOT_FOUND') {
                    return errorResponse(res, 'NOT_FOUND', 'Oferta nie została znaleziona', 404);
                }
                if (result.error === 'ALREADY_DECIDED') {
                    return errorResponse(res, 'ALREADY_DECIDED', 'Oferta została już rozpatrzona', 409);
                }
                if (result.error === 'EXPIRED') {
                    return errorResponse(res, 'EXPIRED', 'Oferta wygasła', 410);
                }
                return errorResponse(res, 'UNKNOWN_ERROR', 'Nieznany błąd', 400);
            }

            return successResponse(res, result.data);
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

            if ('error' in result) {
                if (result.error === 'NOT_FOUND') {
                    return errorResponse(res, 'NOT_FOUND', 'Oferta nie została znaleziona', 404);
                }
                if (result.error === 'ALREADY_DECIDED') {
                    return errorResponse(res, 'ALREADY_DECIDED', 'Oferta została już rozpatrzona', 409);
                }
                if (result.error === 'EXPIRED') {
                    return errorResponse(res, 'EXPIRED', 'Oferta wygasła', 410);
                }
                return errorResponse(res, 'UNKNOWN_ERROR', 'Nieznany błąd', 400);
            }

            return successResponse(res, result.data);
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
            const { items } = req.body;

            await publicOfferService.trackSelection(token, items);

            return successResponse(res, { tracked: true });
        } catch (error) {
            console.error('[PublicOffer] TrackSelection error:', error);
            return errorResponse(res, 'INTERNAL_ERROR', 'Błąd serwera', 500);
        }
    }
}

export const publicOfferController = new PublicOfferController();