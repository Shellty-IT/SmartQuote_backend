// smartquote_backend/src/controllers/contracts.controller.ts

import { Request, Response, NextFunction } from 'express';
import contractsService from '../services/contracts.service';
import { pdfService } from '../services/pdf.service';
import prisma from '../lib/prisma';
import { successResponse, errorResponse, paginatedResponse } from '../utils/apiResponse';
import { ContractStatus } from '@prisma/client';

// GET /api/contracts
export async function getContracts(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const { page, limit, status, clientId, search } = req.query;

        const pageNum = page ? parseInt(page as string) : 1;
        const limitNum = limit ? parseInt(limit as string) : 10;

        const result = await contractsService.getContracts({
            userId,
            page: pageNum,
            limit: limitNum,
            status: status as ContractStatus | undefined,
            clientId: clientId as string | undefined,
            search: search as string | undefined,
        });

        return paginatedResponse(
            res,
            result.data,
            result.pagination.total,
            result.pagination.page,
            result.pagination.limit
        );
    } catch (error) {
        next(error);
    }
}

// GET /api/contracts/stats
export async function getContractsStats(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const stats = await contractsService.getContractsStats(userId);
        return successResponse(res, stats);
    } catch (error) {
        next(error);
    }
}

// GET /api/contracts/:id
export async function getContractById(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const { id } = req.params;

        const contract = await contractsService.getContractById(id, userId);

        if (!contract) {
            return errorResponse(res, 'NOT_FOUND', 'Umowa nie znaleziona', 404);
        }

        return successResponse(res, contract);
    } catch (error) {
        next(error);
    }
}

// GET /api/contracts/:id/pdf
export async function generateContractPDF(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const { id } = req.params;

        // Pobierz umowę z wszystkimi relacjami
        const contract = await prisma.contract.findFirst({
            where: { id, userId },
            include: {
                client: true,
                items: { orderBy: { position: 'asc' } },
                user: true,
            },
        });

        if (!contract) {
            return errorResponse(res, 'NOT_FOUND', 'Umowa nie znaleziona', 404);
        }

        // Generuj PDF
        const pdfBuffer = await pdfService.generateContractPDF(contract);

        // Ustaw nagłówki odpowiedzi
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="umowa-${contract.number.replace(/\//g, '-')}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);

        return res.send(pdfBuffer);
    } catch (error) {
        next(error);
    }
}

// POST /api/contracts
export async function createContract(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const contract = await contractsService.createContract(userId, req.body);
        return successResponse(res, contract, 201);
    } catch (error) {
        next(error);
    }
}

// POST /api/contracts/from-offer/:offerId
export async function createContractFromOffer(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const { offerId } = req.params;

        const contract = await contractsService.createContractFromOffer(offerId, userId);

        if (!contract) {
            return errorResponse(res, 'NOT_FOUND', 'Oferta nie znaleziona', 404);
        }

        return successResponse(res, contract, 201);
    } catch (error) {
        next(error);
    }
}

// PUT /api/contracts/:id
export async function updateContract(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const { id } = req.params;

        const contract = await contractsService.updateContract(id, userId, req.body);

        if (!contract) {
            return errorResponse(res, 'NOT_FOUND', 'Umowa nie znaleziona', 404);
        }

        return successResponse(res, contract);
    } catch (error) {
        next(error);
    }
}

// PUT /api/contracts/:id/status
export async function updateContractStatus(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const { id } = req.params;
        const { status } = req.body;

        const updateData: { status: ContractStatus; signedAt?: Date } = { status };

        // Jeśli status zmienia się na ACTIVE, ustaw datę podpisania
        if (status === 'ACTIVE') {
            updateData.signedAt = new Date();
        }

        const contract = await contractsService.updateContract(id, userId, updateData);

        if (!contract) {
            return errorResponse(res, 'NOT_FOUND', 'Umowa nie znaleziona', 404);
        }

        return successResponse(res, contract);
    } catch (error) {
        next(error);
    }
}

// DELETE /api/contracts/:id
export async function deleteContract(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const { id } = req.params;

        const deleted = await contractsService.deleteContract(id, userId);

        if (!deleted) {
            return errorResponse(res, 'NOT_FOUND', 'Umowa nie znaleziona', 404);
        }

        return successResponse(res, { message: 'Umowa została usunięta' });
    } catch (error) {
        next(error);
    }
}

export default {
    getContracts,
    getContractsStats,
    getContractById,
    generateContractPDF,
    createContract,
    createContractFromOffer,
    updateContract,
    updateContractStatus,
    deleteContract,
};