// src/controllers/offer-templates.controller.ts

import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { offerTemplatesService } from '../services/offer-templates.service';
import { successResponse, errorResponse, paginatedResponse } from '../utils/apiResponse';
import { createOfferTemplateSchema, updateOfferTemplateSchema, getOfferTemplatesSchema } from '../validators/offer-templates.validator';

export class OfferTemplatesController {
    async create(req: AuthenticatedRequest, res: Response) {
        try {
            const parsed = createOfferTemplateSchema.safeParse(req.body);
            if (!parsed.success) {
                return errorResponse(res, 'VALIDATION_ERROR', parsed.error.errors[0].message, 400);
            }

            const template = await offerTemplatesService.create(req.user!.id, parsed.data);
            return successResponse(res, template, 201);
        } catch (error: unknown) {
            return errorResponse(res, 'CREATE_FAILED', 'Nie udało się utworzyć szablonu', 500);
        }
    }

    async findById(req: AuthenticatedRequest, res: Response) {
        try {
            const template = await offerTemplatesService.findById(req.params.id, req.user!.id);
            if (!template) {
                return errorResponse(res, 'NOT_FOUND', 'Szablon nie znaleziony', 404);
            }
            return successResponse(res, template);
        } catch (error: unknown) {
            return errorResponse(res, 'FETCH_FAILED', 'Nie udało się pobrać szablonu', 500);
        }
    }

    async findAll(req: AuthenticatedRequest, res: Response) {
        try {
            const parsed = getOfferTemplatesSchema.safeParse(req.query);
            if (!parsed.success) {
                return errorResponse(res, 'VALIDATION_ERROR', parsed.error.errors[0].message, 400);
            }

            const { templates, total, page, limit } = await offerTemplatesService.findAll(
                req.user!.id,
                parsed.data
            );
            return paginatedResponse(res, templates, total, page, limit);
        } catch (error: unknown) {
            return errorResponse(res, 'FETCH_FAILED', 'Nie udało się pobrać listy szablonów', 500);
        }
    }

    async getCategories(req: AuthenticatedRequest, res: Response) {
        try {
            const categories = await offerTemplatesService.getCategories(req.user!.id);
            return successResponse(res, categories);
        } catch (error: unknown) {
            return errorResponse(res, 'FETCH_FAILED', 'Nie udało się pobrać kategorii', 500);
        }
    }

    async update(req: AuthenticatedRequest, res: Response) {
        try {
            const parsed = updateOfferTemplateSchema.safeParse(req.body);
            if (!parsed.success) {
                return errorResponse(res, 'VALIDATION_ERROR', parsed.error.errors[0].message, 400);
            }

            const template = await offerTemplatesService.update(req.params.id, req.user!.id, parsed.data);
            if (!template) {
                return errorResponse(res, 'NOT_FOUND', 'Szablon nie znaleziony', 404);
            }
            return successResponse(res, template);
        } catch (error: unknown) {
            return errorResponse(res, 'UPDATE_FAILED', 'Nie udało się zaktualizować szablonu', 500);
        }
    }

    async delete(req: AuthenticatedRequest, res: Response) {
        try {
            const template = await offerTemplatesService.delete(req.params.id, req.user!.id);
            if (!template) {
                return errorResponse(res, 'NOT_FOUND', 'Szablon nie znaleziony', 404);
            }
            return successResponse(res, { message: 'Szablon usunięty' });
        } catch (error: unknown) {
            return errorResponse(res, 'DELETE_FAILED', 'Nie udało się usunąć szablonu', 500);
        }
    }
}

export const offerTemplatesController = new OfferTemplatesController();