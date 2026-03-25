// src/controllers/publicContract.controller.ts
import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { pdfService } from '../services/pdf';
import { publicContractService } from '../services/publicContract.service';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { mapToPDFUser, mapToPDFClient } from '../services/pdf/data-mapper';

class PublicContractController {
    async getContract(req: Request<{ token: string }>, res: Response) {
        try {
            const { token } = req.params;

            const contract = await prisma.contract.findUnique({
                where: { publicToken: token },
                include: {
                    client: {
                        select: {
                            name: true,
                            company: true,
                            email: true,
                            phone: true,
                            nip: true,
                            address: true,
                            city: true,
                            postalCode: true,
                        },
                    },
                    items: { orderBy: { position: 'asc' } },
                    signatureLog: {
                        select: {
                            signerName: true,
                            signerEmail: true,
                            signedAt: true,
                            contentHash: true,
                            signatureImage: true,
                            ipAddress: true,
                        },
                    },
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
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
                                    website: true,
                                    logo: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!contract) {
                return errorResponse(res, 'NOT_FOUND', 'Umowa nie została znaleziona lub link jest nieaktywny', 404);
            }

            const seller = mapToPDFUser(contract.user);

            const items = contract.items.map(item => ({
                id: item.id,
                name: item.name,
                description: item.description,
                quantity: Number(item.quantity),
                unit: item.unit,
                unitPrice: Number(item.unitPrice),
                vatRate: Number(item.vatRate),
                discount: Number(item.discount),
                totalNet: Number(item.totalNet),
                totalVat: Number(item.totalVat),
                totalGross: Number(item.totalGross),
                position: item.position,
            }));

            return successResponse(res, {
                contract: {
                    id: contract.id,
                    number: contract.number,
                    title: contract.title,
                    description: contract.description,
                    status: contract.status,
                    totalNet: Number(contract.totalNet),
                    totalVat: Number(contract.totalVat),
                    totalGross: Number(contract.totalGross),
                    currency: contract.currency,
                    startDate: contract.startDate,
                    endDate: contract.endDate,
                    signedAt: contract.signedAt,
                    terms: contract.terms,
                    paymentTerms: contract.paymentTerms,
                    paymentDays: contract.paymentDays,
                    createdAt: contract.createdAt,
                    items,
                    client: contract.client,
                    seller,
                    signatureLog: contract.signatureLog || null,
                },
            });
        } catch (error: unknown) {
            console.error('[PublicContract] GetContract error:', error);
            return errorResponse(res, 'INTERNAL_ERROR', 'Błąd serwera', 500);
        }
    }

    async downloadPdf(req: Request<{ token: string }>, res: Response) {
        try {
            const { token } = req.params;

            const contract = await prisma.contract.findUnique({
                where: { publicToken: token },
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
                return errorResponse(res, 'NOT_FOUND', 'Umowa nie została znaleziona', 404);
            }

            const pdfContract = {
                ...contract,
                user: mapToPDFUser(contract.user),
                client: mapToPDFClient(contract.client),
            };

            const pdfBuffer = await pdfService.generateContractPDF(pdfContract as any);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="umowa-${contract.number.replace(/\//g, '-')}.pdf"`);
            res.setHeader('Content-Length', pdfBuffer.length);

            return res.send(pdfBuffer);
        } catch (error: unknown) {
            console.error('[PublicContract] DownloadPdf error:', error);
            return errorResponse(res, 'INTERNAL_ERROR', 'Błąd generowania PDF', 500);
        }
    }

    async signContract(req: Request<{ token: string }>, res: Response) {
        try {
            const { token } = req.params;
            const { signerName, signerEmail, signatureImage } = req.body;

            const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
                || req.socket.remoteAddress
                || 'unknown';
            const userAgent = req.headers['user-agent'] || 'unknown';

            const result = await publicContractService.signContract(token, {
                signerName,
                signerEmail,
                signatureImage,
                ipAddress,
                userAgent,
            });

            if (result.error) {
                const statusMap: Record<string, number> = {
                    NOT_FOUND: 404,
                    ALREADY_SIGNED: 409,
                    INVALID_STATUS: 400,
                };
                const status = statusMap[result.error] || 400;
                return errorResponse(res, result.error, result.message || 'Błąd podpisywania', status);
            }

            return successResponse(res, result.data);
        } catch (error: unknown) {
            console.error('[PublicContract] SignContract error:', error);
            return errorResponse(res, 'INTERNAL_ERROR', 'Błąd podpisywania umowy', 500);
        }
    }
}

export const publicContractController = new PublicContractController();