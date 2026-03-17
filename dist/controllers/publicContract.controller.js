"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicContractController = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const pdf_service_1 = require("../services/pdf.service");
const apiResponse_1 = require("../utils/apiResponse");
class PublicContractController {
    async getContract(req, res) {
        try {
            const { token } = req.params;
            const contract = await prisma_1.default.contract.findUnique({
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
                return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Umowa nie została znaleziona lub link jest nieaktywny', 404);
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
            return (0, apiResponse_1.successResponse)(res, {
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
        }
        catch (error) {
            console.error('[PublicContract] GetContract error:', error);
            return (0, apiResponse_1.errorResponse)(res, 'INTERNAL_ERROR', 'Błąd serwera', 500);
        }
    }
    async downloadPdf(req, res) {
        try {
            const { token } = req.params;
            const contract = await prisma_1.default.contract.findUnique({
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
                return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Umowa nie została znaleziona', 404);
            }
            const pdfContract = {
                ...contract,
                user: {
                    ...contract.user,
                    company: contract.user.companyInfo?.name || null,
                    phone: contract.user.companyInfo?.phone || contract.user.phone,
                },
            };
            const pdfBuffer = await pdf_service_1.pdfService.generateContractPDF(pdfContract);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="umowa-${contract.number.replace(/\//g, '-')}.pdf"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            return res.send(pdfBuffer);
        }
        catch (error) {
            console.error('[PublicContract] DownloadPdf error:', error);
            return (0, apiResponse_1.errorResponse)(res, 'INTERNAL_ERROR', 'Błąd generowania PDF', 500);
        }
    }
}
exports.publicContractController = new PublicContractController();
