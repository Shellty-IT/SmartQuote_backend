// src/controllers/contracts.controller.ts

import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import contractsService from '../services/contracts.service';
import { contractsRepository } from '../repositories/contracts.repository';
import { pdfService } from '../services/pdf';
import { successResponse, errorResponse, paginatedResponse } from '../utils/apiResponse';
import { mapToPDFUser, mapToPDFClient } from '../services/pdf/data-mapper';
import { NotFoundError } from '../errors/domain.errors';
import { ContractStatus } from '@prisma/client';

export async function getContracts(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const { page, limit, status, clientId, search } = req.query;

        const result = await contractsService.getContracts({
            userId,
            page: page ? parseInt(page as string) : 1,
            limit: limit ? parseInt(limit as string) : 10,
            status: status as ContractStatus | undefined,
            clientId: clientId as string | undefined,
            search: search as string | undefined,
        });

        return paginatedResponse(
            res,
            result.data,
            result.pagination.total,
            result.pagination.page,
            result.pagination.limit,
        );
    } catch (err) {
        next(err);
    }
}

export async function getContractsStats(req: Request, res: Response, next: NextFunction) {
    try {
        const stats = await contractsService.getContractsStats(req.user!.id);
        return successResponse(res, stats);
    } catch (err) {
        next(err);
    }
}

export async function getContractById(req: Request, res: Response, next: NextFunction) {
    try {
        const contract = await contractsService.getContractById(req.params.id, req.user!.id);
        if (!contract) throw new NotFoundError('Umowa');
        return successResponse(res, contract);
    } catch (err) {
        next(err);
    }
}

export async function generateContractPDF(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const userId = req.user!.id;

        const contract = await contractsRepository.findByIdWithUser(id, userId);
        if (!contract) throw new NotFoundError('Umowa');

        const pdfContract = {
            ...contract,
            user: mapToPDFUser({
                id: contract.user.id,
                email: contract.user.email,
                name: contract.user.name,
                phone: contract.user.companyInfo?.phone ?? contract.user.phone,
                companyInfo: contract.user.companyInfo,
            }),
            client: mapToPDFClient(contract.client),
        };

        const pdfBuffer = await pdfService.generateContractPDF(
            pdfContract as Parameters<typeof pdfService.generateContractPDF>[0],
        );

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="umowa-${contract.number.replace(/\//g, '-')}.pdf"`,
        );
        res.setHeader('Content-Length', pdfBuffer.length);

        return res.send(pdfBuffer);
    } catch (err) {
        next(err);
    }
}

export async function createContract(req: Request, res: Response, next: NextFunction) {
    try {
        const contract = await contractsService.createContract(req.user!.id, req.body);
        return successResponse(res, contract, 201);
    } catch (err) {
        next(err);
    }
}

export async function createContractFromOffer(req: Request, res: Response, next: NextFunction) {
    try {
        const contract = await contractsService.createContractFromOffer(
            req.params.offerId,
            req.user!.id,
        );
        return successResponse(res, contract, 201);
    } catch (err) {
        next(err);
    }
}

export async function updateContract(req: Request, res: Response, next: NextFunction) {
    try {
        const contract = await contractsService.updateContract(
            req.params.id,
            req.user!.id,
            req.body,
        );
        return successResponse(res, contract);
    } catch (err) {
        next(err);
    }
}

export async function updateContractStatus(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const { status } = req.body as { status: ContractStatus };

        const updateData: {
            status: ContractStatus;
            signedAt?: Date;
            sentAt?: Date;
        } = { status };

        if (status === 'ACTIVE') updateData.signedAt = new Date();
        if (status === 'PENDING_SIGNATURE') updateData.sentAt = new Date();

        const contract = await contractsService.updateContract(id, req.user!.id, updateData);
        return successResponse(res, contract);
    } catch (err) {
        next(err);
    }
}

export async function publishContract(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const userId = req.user!.id;

        const contract = await contractsRepository.findPublicToken(id, userId);
        if (!contract) throw new NotFoundError('Umowa');

        const frontendUrl = (process.env.FRONTEND_URL ?? 'http://localhost:3000').replace(/\/$/, '');

        if (contract.publicToken) {
            return successResponse(res, {
                publicToken: contract.publicToken,
                publicUrl: `${frontendUrl}/contract/view/${contract.publicToken}`,
                alreadyPublished: true,
            });
        }

        const token = randomBytes(32).toString('hex');

        await contractsRepository.update(id, { publicToken: token });

        return successResponse(res, {
            publicToken: token,
            publicUrl: `${frontendUrl}/contract/view/${token}`,
            alreadyPublished: false,
        });
    } catch (err) {
        next(err);
    }
}

export async function unpublishContract(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const userId = req.user!.id;

        const contract = await contractsRepository.findById(id, userId);
        if (!contract) throw new NotFoundError('Umowa');

        await contractsRepository.update(id, { publicToken: null });

        return successResponse(res, { unpublished: true });
    } catch (err) {
        next(err);
    }
}

export async function deleteContract(req: Request, res: Response, next: NextFunction) {
    try {
        await contractsService.deleteContract(req.params.id, req.user!.id);
        return successResponse(res, { message: 'Umowa została usunięta' });
    } catch (err) {
        next(err);
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