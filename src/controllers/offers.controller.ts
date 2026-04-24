// src/controllers/offers.controller.ts
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { offersService } from '../services/offers.service';
import { successResponse, paginatedResponse } from '../utils/apiResponse';

export class OffersController {
    async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const offer = await offersService.create(req.user!.id, req.body);
            return successResponse(res, offer, 201);
        } catch (err) {
            next(err);
        }
    }

    async findById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const offer = await offersService.findById(req.params.id, req.user!.id);
            return successResponse(res, offer);
        } catch (err) {
            next(err);
        }
    }

    async findAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { offers, total, page, limit } = await offersService.findAll(
                req.user!.id,
                req.query as Record<string, string | undefined>,
            );
            return paginatedResponse(res, offers, total, page, limit);
        } catch (err) {
            next(err);
        }
    }

    async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const offer = await offersService.update(req.params.id, req.user!.id, req.body);
            return successResponse(res, offer);
        } catch (err) {
            next(err);
        }
    }

    async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            await offersService.delete(req.params.id, req.user!.id);
            return successResponse(res, { message: 'Oferta usunięta' });
        } catch (err) {
            next(err);
        }
    }

    async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const stats = await offersService.getStats(req.user!.id);
            return successResponse(res, stats);
        } catch (err) {
            next(err);
        }
    }

    async duplicate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const offer = await offersService.duplicate(req.params.id, req.user!.id);
            return successResponse(res, offer, 201);
        } catch (err) {
            next(err);
        }
    }

    async generatePDF(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { buffer, filename } = await offersService.generatePDF(
                req.params.id,
                req.user!.id,
            );

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', buffer.length);

            return res.send(buffer);
        } catch (err) {
            next(err);
        }
    }

    async publish(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const result = await offersService.publishOffer(req.params.id, req.user!.id);
            return successResponse(res, result);
        } catch (err) {
            next(err);
        }
    }

    async unpublish(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            await offersService.unpublishOffer(req.params.id, req.user!.id);
            return successResponse(res, { unpublished: true });
        } catch (err) {
            next(err);
        }
    }

    async getAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const analytics = await offersService.getOfferAnalytics(req.params.id, req.user!.id);
            return successResponse(res, analytics);
        } catch (err) {
            next(err);
        }
    }

    async getComments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const comments = await offersService.getOfferComments(req.params.id, req.user!.id);
            return successResponse(res, comments);
        } catch (err) {
            next(err);
        }
    }

    async addComment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { content } = req.body as { content: string };
            const comment = await offersService.addSellerComment(
                req.params.id,
                req.user!.id,
                content,
            );
            return successResponse(res, comment, 201);
        } catch (err) {
            next(err);
        }
    }

    async sendToClient(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const result = await offersService.sendOfferToClient(req.params.id, req.user!.id);
            return successResponse(res, result);
        } catch (err) {
            next(err);
        }
    }
}

export const offersController = new OffersController();