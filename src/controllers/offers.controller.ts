// smartquote_backend/src/controllers/offers.controller.ts

import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { offersService } from '../services/offers.service';
import { pdfService } from '../services/pdf';
import { successResponse, errorResponse, paginatedResponse } from '../utils/apiResponse';
import prisma from '../lib/prisma';

export class OffersController {
    async create(req: AuthenticatedRequest, res: Response) {
        try {
            const offer = await offersService.create(req.user!.id, req.body);
            return successResponse(res, offer, 201);
        } catch (error: unknown) {
            console.error('[Offers] Create error:', error);
            if (error instanceof Error && error.message === 'CLIENT_NOT_FOUND') {
                return errorResponse(res, 'CLIENT_NOT_FOUND', 'Klient nie znaleziony', 404);
            }
            return errorResponse(res, 'CREATE_FAILED', 'Nie udało się utworzyć oferty', 500);
        }
    }

    async findById(req: AuthenticatedRequest, res: Response) {
        try {
            const offer = await offersService.findById(req.params.id, req.user!.id);
            if (!offer) {
                return errorResponse(res, 'NOT_FOUND', 'Oferta nie znaleziona', 404);
            }
            return successResponse(res, offer);
        } catch (error: unknown) {
            console.error('[Offers] FindById error:', error);
            return errorResponse(res, 'FETCH_FAILED', 'Nie udało się pobrać oferty', 500);
        }
    }

    async findAll(req: AuthenticatedRequest, res: Response) {
        try {
            const { offers, total, page, limit } = await offersService.findAll(
                req.user!.id,
                req.query as Record<string, string | undefined>
            );
            return paginatedResponse(res, offers, total, page, limit);
        } catch (error: unknown) {
            console.error('[Offers] FindAll error:', error);
            return errorResponse(res, 'FETCH_FAILED', 'Nie udało się pobrać listy ofert', 500);
        }
    }

    async update(req: AuthenticatedRequest, res: Response) {
        try {
            const offer = await offersService.update(req.params.id, req.user!.id, req.body);
            if (!offer) {
                return errorResponse(res, 'NOT_FOUND', 'Oferta nie znaleziona', 404);
            }
            return successResponse(res, offer);
        } catch (error: unknown) {
            console.error('[Offers] Update error:', error);
            return errorResponse(res, 'UPDATE_FAILED', 'Nie udało się zaktualizować oferty', 500);
        }
    }

    async delete(req: AuthenticatedRequest, res: Response) {
        try {
            const offer = await offersService.delete(req.params.id, req.user!.id);
            if (!offer) {
                return errorResponse(res, 'NOT_FOUND', 'Oferta nie znaleziona', 404);
            }
            return successResponse(res, { message: 'Oferta usunięta' });
        } catch (error: unknown) {
            console.error('[Offers] Delete error:', error);
            return errorResponse(res, 'DELETE_FAILED', 'Nie udało się usunąć oferty', 500);
        }
    }

    async getStats(req: AuthenticatedRequest, res: Response) {
        try {
            const stats = await offersService.getStats(req.user!.id);
            return successResponse(res, stats);
        } catch (error: unknown) {
            console.error('[Offers] Stats error:', error);
            return errorResponse(res, 'STATS_FAILED', 'Nie udało się pobrać statystyk', 500);
        }
    }

    async duplicate(req: AuthenticatedRequest, res: Response) {
        try {
            const offer = await offersService.duplicate(req.params.id, req.user!.id);
            if (!offer) {
                return errorResponse(res, 'NOT_FOUND', 'Oferta nie znaleziona', 404);
            }
            return successResponse(res, offer, 201);
        } catch (error: unknown) {
            console.error('[Offers] Duplicate error:', error);
            return errorResponse(res, 'DUPLICATE_FAILED', 'Nie udało się skopiować oferty', 500);
        }
    }

    async generatePDF(req: AuthenticatedRequest, res: Response) {
        try {
            const { id } = req.params;
            const userId = req.user!.id;

            const offer = await prisma.offer.findFirst({
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
                return errorResponse(res, 'NOT_FOUND', 'Oferta nie znaleziona', 404);
            }

            const pdfOffer = {
                ...offer,
                user: {
                    ...offer.user,
                    company: offer.user.companyInfo?.name || null,
                    phone: offer.user.companyInfo?.phone || offer.user.phone,
                },
            };

            const pdfBuffer = await pdfService.generateOfferPDF(pdfOffer);
            const filename = `Oferta_${offer.number.replace(/\//g, '-')}.pdf`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', pdfBuffer.length);

            return res.send(pdfBuffer);
        } catch (error: unknown) {
            console.error('[Offers] GeneratePDF error:', error);
            return errorResponse(res, 'PDF_FAILED', 'Nie udało się wygenerować PDF', 500);
        }
    }

    async publish(req: AuthenticatedRequest, res: Response) {
        try {
            const result = await offersService.publishOffer(req.params.id, req.user!.id);
            if (!result) {
                return errorResponse(res, 'NOT_FOUND', 'Oferta nie znaleziona', 404);
            }
            return successResponse(res, result);
        } catch (error: unknown) {
            console.error('[Offers] Publish error:', error);
            return errorResponse(res, 'PUBLISH_FAILED', 'Nie udało się opublikować oferty', 500);
        }
    }

    async unpublish(req: AuthenticatedRequest, res: Response) {
        try {
            const result = await offersService.unpublishOffer(req.params.id, req.user!.id);
            if (!result) {
                return errorResponse(res, 'NOT_FOUND', 'Oferta nie znaleziona', 404);
            }
            return successResponse(res, { unpublished: true });
        } catch (error: unknown) {
            console.error('[Offers] Unpublish error:', error);
            return errorResponse(res, 'UNPUBLISH_FAILED', 'Nie udało się dezaktywować linku', 500);
        }
    }

    async getAnalytics(req: AuthenticatedRequest, res: Response) {
        try {
            const analytics = await offersService.getOfferAnalytics(req.params.id, req.user!.id);
            if (!analytics) {
                return errorResponse(res, 'NOT_FOUND', 'Oferta nie znaleziona', 404);
            }
            return successResponse(res, analytics);
        } catch (error: unknown) {
            console.error('[Offers] Analytics error:', error);
            return errorResponse(res, 'ANALYTICS_FAILED', 'Nie udało się pobrać analityki', 500);
        }
    }

    async getComments(req: AuthenticatedRequest, res: Response) {
        try {
            const comments = await offersService.getOfferComments(req.params.id, req.user!.id);
            if (comments === null) {
                return errorResponse(res, 'NOT_FOUND', 'Oferta nie znaleziona', 404);
            }
            return successResponse(res, comments);
        } catch (error: unknown) {
            console.error('[Offers] GetComments error:', error);
            return errorResponse(res, 'FETCH_FAILED', 'Nie udało się pobrać komentarzy', 500);
        }
    }

    async addComment(req: AuthenticatedRequest, res: Response) {
        try {
            const { content } = req.body;
            const comment = await offersService.addSellerComment(req.params.id, req.user!.id, content);
            if (!comment) {
                return errorResponse(res, 'NOT_FOUND', 'Oferta nie znaleziona', 404);
            }
            return successResponse(res, comment, 201);
        } catch (error: unknown) {
            console.error('[Offers] AddComment error:', error);
            return errorResponse(res, 'COMMENT_FAILED', 'Nie udało się dodać komentarza', 500);
        }
    }

    async sendToClient(req: AuthenticatedRequest, res: Response) {
        try {
            const result = await offersService.sendOfferToClient(req.params.id, req.user!.id);
            return successResponse(res, result);
        } catch (error: unknown) {
            console.error('[Offers] SendToClient error:', error);

            if (error instanceof Error) {
                const errorMap: Record<string, { code: string; message: string; status: number }> = {
                    OFFER_NOT_FOUND: { code: 'NOT_FOUND', message: 'Oferta nie znaleziona', status: 404 },
                    CLIENT_NO_EMAIL: { code: 'CLIENT_NO_EMAIL', message: 'Klient nie ma podanego adresu email', status: 400 },
                    SMTP_NOT_CONFIGURED: { code: 'SMTP_NOT_CONFIGURED', message: 'Skonfiguruj skrzynkę pocztową w ustawieniach, aby wysyłać maile', status: 400 },
                    PUBLISH_FAILED: { code: 'PUBLISH_FAILED', message: 'Nie udało się opublikować oferty', status: 500 },
                    EMAIL_SEND_FAILED: { code: 'EMAIL_SEND_FAILED', message: 'Nie udało się wysłać maila. Sprawdź konfigurację SMTP', status: 500 },
                };
                const mapped = errorMap[error.message];
                if (mapped) {
                    return errorResponse(res, mapped.code, mapped.message, mapped.status);
                }
            }

            return errorResponse(res, 'SEND_FAILED', 'Nie udało się wysłać oferty do klienta', 500);
        }
    }
}

export const offersController = new OffersController();