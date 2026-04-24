// src/controllers/ai.controller.ts
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { aiService } from '../services/ai';
import { successResponse, paginatedResponse } from '../utils/apiResponse';
import { ValidationError } from '../errors/domain.errors';

export class AIController {
    async chat(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const { message, history } = req.body;

            const response = await aiService.chat(userId, message, history);
            return successResponse(res, response);
        } catch (err) {
            next(err);
        }
    }

    async generateOffer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const { description } = req.body;

            const offer = await aiService.generateOffer(userId, description);
            return successResponse(res, offer);
        } catch (err) {
            next(err);
        }
    }

    async generateEmail(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const { type, clientName, offerTitle, customContext } = req.body;

            const email = await aiService.generateEmail(userId, type, {
                clientName,
                offerTitle,
                customContext,
            });

            return successResponse(res, { email });
        } catch (err) {
            next(err);
        }
    }

    async analyzeClient(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const { clientId } = req.params;

            const analysis = await aiService.analyzeClient(userId, clientId);
            return successResponse(res, analysis);
        } catch (err) {
            next(err);
        }
    }

    async clearHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            aiService.clearConversationHistory(userId);
            return successResponse(res, { message: 'Historia konwersacji wyczyszczona' });
        } catch (err) {
            next(err);
        }
    }

    async getSuggestions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;

            const result = await aiService.getSuggestions(userId);
            return successResponse(res, result);
        } catch (err) {
            next(err);
        }
    }

    async priceInsight(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const { itemName, category } = req.body;

            const result = await aiService.getPriceInsight(userId, itemName, category);
            return successResponse(res, result);
        } catch (err) {
            next(err);
        }
    }

    async observerInsight(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const { offerId } = req.params;

            const result = await aiService.getObserverInsight(userId, offerId);
            return successResponse(res, result);
        } catch (err) {
            next(err);
        }
    }

    async closingStrategy(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const { offerId } = req.params;

            const result = await aiService.getClosingStrategy(userId, offerId);
            return successResponse(res, result);
        } catch (err) {
            next(err);
        }
    }

    async latestInsights(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const limit = req.query.limit ? Number(req.query.limit) : 3;

            const result = await aiService.getLatestInsights(userId, limit);
            return successResponse(res, result);
        } catch (err) {
            next(err);
        }
    }

    async insightsList(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const { page = 1, limit = 10, outcome, dateFrom, dateTo, search } = req.query;

            const result = await aiService.getInsightsList(userId, {
                page: Number(page),
                limit: Number(limit),
                outcome: outcome as 'ACCEPTED' | 'REJECTED' | undefined,
                dateFrom: dateFrom as string | undefined,
                dateTo: dateTo as string | undefined,
                search: search as string | undefined,
            });

            return paginatedResponse(res, result.data, result.total, Number(page), Number(limit));
        } catch (err) {
            next(err);
        }
    }
}

export const aiController = new AIController();