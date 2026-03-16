// smartquote_backend/src/controllers/contracts.controller.ts
import '../types';
import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import contractsService from '../services/contracts.service';
import { pdfService } from '../services/pdf.service';
import prisma from '../lib/prisma';
import { successResponse, errorResponse, paginatedResponse } from '../utils/apiResponse';
import { ContractStatus } from '@prisma/client';

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

export async function getContractsStats(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const stats = await contractsService.getContractsStats(userId);
        return successResponse(res, stats);
    } catch (error) {
        next(error);
    }
}

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

export async function generateContractPDF(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const { id } = req.params;

        const contract = await prisma.contract.findFirst({
            where: { id, userId },
            include: {
                client: true,
                items: { orderBy: { position: 'asc' } },
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

        if (!contract) {
            return errorResponse(res, 'NOT_FOUND', 'Umowa nie znaleziona', 404);
        }

        const pdfContract = {
            ...contract,
            user: {
                ...contract.user,
                company: contract.user.companyInfo?.name || null,
                phone: contract.user.companyInfo?.phone || contract.user.phone,
            },
        };

        const pdfBuffer = await pdfService.generateContractPDF(pdfContract);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="umowa-${contract.number.replace(/\//g, '-')}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);

        return res.send(pdfBuffer);
    } catch (error) {
        next(error);
    }
}

export async function createContract(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const contract = await contractsService.createContract(userId, req.body);
        return successResponse(res, contract, 201);
    } catch (error) {
        next(error);
    }
}

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

export async function updateContractStatus(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const { id } = req.params;
        const { status } = req.body;

        const updateData: { status: ContractStatus; signedAt?: Date; sentAt?: Date } = { status };

        if (status === 'ACTIVE') {
            updateData.signedAt = new Date();
        }

        if (status === 'PENDING_SIGNATURE') {
            updateData.sentAt = new Date();
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

export async function publishContract(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const { id } = req.params;

        const contract = await prisma.contract.findFirst({
            where: { id, userId },
            select: { id: true, publicToken: true },
        });

        if (!contract) {
            return errorResponse(res, 'NOT_FOUND', 'Umowa nie znaleziona', 404);
        }

        if (contract.publicToken) {
            const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
            return successResponse(res, {
                publicToken: contract.publicToken,
                publicUrl: `${frontendUrl}/contract/view/${contract.publicToken}`,
                alreadyPublished: true,
            });
        }

        const token = randomBytes(32).toString('hex');

        await prisma.contract.update({
            where: { id },
            data: { publicToken: token },
        });

        const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

        return successResponse(res, {
            publicToken: token,
            publicUrl: `${frontendUrl}/contract/view/${token}`,
            alreadyPublished: false,
        });
    } catch (error) {
        next(error);
    }
}

export async function unpublishContract(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const { id } = req.params;

        const contract = await prisma.contract.findFirst({
            where: { id, userId },
        });

        if (!contract) {
            return errorResponse(res, 'NOT_FOUND', 'Umowa nie znaleziona', 404);
        }

        await prisma.contract.update({
            where: { id },
            data: { publicToken: null },
        });

        return successResponse(res, { unpublished: true });
    } catch (error) {
        next(error);
    }
}

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
    publishContract,
    unpublishContract,
    deleteContract,
};