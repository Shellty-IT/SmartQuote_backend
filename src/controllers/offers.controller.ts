// smartquote_backend/src/controllers/offers.controller.ts

import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { offersService } from '../services/offers.service';
import { pdfService } from '../services/pdf.service';
import { successResponse, errorResponse, paginatedResponse } from '../utils/apiResponse';
import prisma from '../lib/prisma';

export class OffersController {
    async create(req: AuthenticatedRequest, res: Response) {
        try {
            const offer = await offersService.create(req.user!.id, req.body);
            return successResponse(res, offer, 201);
        } catch (error: any) {
            console.error('[Offers] Create error:', error);

            if (error.message === 'CLIENT_NOT_FOUND') {
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
        } catch (error) {
            console.error('[Offers] FindById error:', error);
            return errorResponse(res, 'FETCH_FAILED', 'Nie udało się pobrać oferty', 500);
        }
    }

    async findAll(req: AuthenticatedRequest, res: Response) {
        try {
            const { offers, total, page, limit } = await offersService.findAll(
                req.user!.id,
                req.query as any
            );

            return paginatedResponse(res, offers, total, page, limit);
        } catch (error) {
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
        } catch (error) {
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
        } catch (error) {
            console.error('[Offers] Delete error:', error);
            return errorResponse(res, 'DELETE_FAILED', 'Nie udało się usunąć oferty', 500);
        }
    }

    async getStats(req: AuthenticatedRequest, res: Response) {
        try {
            const stats = await offersService.getStats(req.user!.id);
            return successResponse(res, stats);
        } catch (error) {
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
        } catch (error) {
            console.error('[Offers] Duplicate error:', error);
            return errorResponse(res, 'DUPLICATE_FAILED', 'Nie udało się skopiować oferty', 500);
        }
    }

    async generatePDF(req: AuthenticatedRequest, res: Response) {
        try {
            const { id } = req.params;
            const userId = req.user!.id;

            // Pobierz ofertę z wszystkimi relacjami + companyInfo
            const offer = await prisma.offer.findFirst({
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

            // Przekształć dane dla PDF service (dodaj company z companyInfo)
            const pdfOffer = {
                ...offer,
                user: {
                    ...offer.user,
                    company: offer.user.companyInfo?.name || null,
                    phone: offer.user.companyInfo?.phone || offer.user.phone,
                },
            };

            // Generuj PDF
            const pdfBuffer = await pdfService.generateOfferPDF(pdfOffer);

            // Ustaw nagłówki odpowiedzi
            const filename = `Oferta_${offer.number.replace(/\//g, '-')}.pdf`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', pdfBuffer.length);

            // Wyślij PDF
            return res.send(pdfBuffer);
        } catch (error) {
            console.error('[Offers] GeneratePDF error:', error);
            return errorResponse(res, 'PDF_FAILED', 'Nie udało się wygenerować PDF', 500);
        }
    }
}

export const offersController = new OffersController();