"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicContractController = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const pdf_1 = require("../services/pdf");
const publicContract_service_1 = require("../services/publicContract.service");
const apiResponse_1 = require("../utils/apiResponse");
const data_mapper_1 = require("../services/pdf/data-mapper");
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
                return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Umowa nie została znaleziona lub link jest nieaktywny', 404);
            }
            const seller = (0, data_mapper_1.mapToPDFUser)(contract.user);
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
                    signatureLog: contract.signatureLog || null,
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
                user: (0, data_mapper_1.mapToPDFUser)(contract.user),
                client: (0, data_mapper_1.mapToPDFClient)(contract.client),
            };
            const pdfBuffer = await pdf_1.pdfService.generateContractPDF(pdfContract);
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
    async signContract(req, res) {
        try {
            const { token } = req.params;
            const { signerName, signerEmail, signatureImage } = req.body;
            const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
                || req.socket.remoteAddress
                || 'unknown';
            const userAgent = req.headers['user-agent'] || 'unknown';
            const result = await publicContract_service_1.publicContractService.signContract(token, {
                signerName,
                signerEmail,
                signatureImage,
                ipAddress,
                userAgent,
            });
            if (result.error) {
                const statusMap = {
                    NOT_FOUND: 404,
                    ALREADY_SIGNED: 409,
                    INVALID_STATUS: 400,
                };
                const status = statusMap[result.error] || 400;
                return (0, apiResponse_1.errorResponse)(res, result.error, result.message || 'Błąd podpisywania', status);
            }
            return (0, apiResponse_1.successResponse)(res, result.data);
        }
        catch (error) {
            console.error('[PublicContract] SignContract error:', error);
            return (0, apiResponse_1.errorResponse)(res, 'INTERNAL_ERROR', 'Błąd podpisywania umowy', 500);
        }
    }
}
exports.publicContractController = new PublicContractController();
