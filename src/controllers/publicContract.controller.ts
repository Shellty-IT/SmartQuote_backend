// smartquote_backend/src/controllers/publicContract.controller.ts
import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { pdfService } from '../services/pdf.service';
import { successResponse, errorResponse } from '../utils/apiResponse';

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
                    user: {
                        select: {
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

            const seller = {
                name: contract.user.companyInfo?.name || contract.user.name,
                email: contract.user.companyInfo?.email || contract.user.email,
                phone: contract.user.companyInfo?.phone || contract.user.phone,
                nip: contract.user.companyInfo?.nip || null,
                address: contract.user.companyInfo?.address || null,
                city: contract.user.companyInfo?.city || null,
                postalCode: contract.user.companyInfo?.postalCode || null,
                website: contract.user.companyInfo?.website || null,
                logo: contract.user.companyInfo?.logo || null,
            };

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
        } catch (error: unknown) {
            console.error('[PublicContract] DownloadPdf error:', error);
            return errorResponse(res, 'INTERNAL_ERROR', 'Błąd generowania PDF', 500);
        }
    }
}

export const publicContractController = new PublicContractController();