// src/controllers/contracts.controller.ts
import { Request, Response, NextFunction } from 'express';
import { contractsService } from '../services/contracts.service';
import { contractsRepository } from '../repositories/contracts.repository';
import { pdfService } from '../services/pdf';
import { successResponse, paginatedResponse } from '../utils/apiResponse';
import { mapToPDFUser, mapToPDFClient } from '../services/pdf/data-mapper';
import { NotFoundError } from '../errors/domain.errors';
import { ContractStatus } from '@prisma/client';

export class ContractsController {
    async getContracts(req: Request, res: Response, next: NextFunction) {
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

    async getContractsStats(req: Request, res: Response, next: NextFunction) {
        try {
            const stats = await contractsService.getContractsStats(req.user!.id);
            return successResponse(res, stats);
        } catch (err) {
            next(err);
        }
    }

    async getContractById(req: Request, res: Response, next: NextFunction) {
        try {
            const contract = await contractsService.getContractById(req.params.id, req.user!.id);
            if (!contract) throw new NotFoundError('Umowa');
            return successResponse(res, contract);
        } catch (err) {
            next(err);
        }
    }

    async generateContractPDF(req: Request, res: Response, next: NextFunction) {
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

    async createContract(req: Request, res: Response, next: NextFunction) {
        try {
            const contract = await contractsService.createContract(req.user!.id, req.body);
            return successResponse(res, contract, 201);
        } catch (err) {
            next(err);
        }
    }

    async createContractFromOffer(req: Request, res: Response, next: NextFunction) {
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

    async updateContract(req: Request, res: Response, next: NextFunction) {
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

    async updateContractStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { status } = req.body as { status: ContractStatus };

            const contract = await contractsService.updateContractStatus(id, req.user!.id, status);
            return successResponse(res, contract);
        } catch (err) {
            next(err);
        }
    }

    async publishContract(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await contractsService.publishContract(req.params.id, req.user!.id);
            return successResponse(res, result);
        } catch (err) {
            next(err);
        }
    }

    async unpublishContract(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await contractsService.unpublishContract(req.params.id, req.user!.id);
            return successResponse(res, result);
        } catch (err) {
            next(err);
        }
    }

    async deleteContract(req: Request, res: Response, next: NextFunction) {
        try {
            await contractsService.deleteContract(req.params.id, req.user!.id);
            return successResponse(res, { message: 'Umowa została usunięta' });
        } catch (err) {
            next(err);
        }
    }
}

export const contractsController = new ContractsController();