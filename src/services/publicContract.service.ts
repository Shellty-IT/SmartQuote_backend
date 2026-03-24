// smartquote_backend/src/services/publicContract.service.ts
import { createHash } from 'crypto';
import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { emailService } from './email';

interface SignContractInput {
    signerName: string;
    signerEmail: string;
    signatureImage: string;
    ipAddress: string;
    userAgent: string;
}

interface SignContractResult {
    error?: string;
    message?: string;
    success?: boolean;
    data?: {
        signedAt: Date;
        contentHash: string;
        signerName: string;
    };
}

function generateContractContentHash(
    items: Array<{ name: string; quantity: number; unitPrice: number; totalGross: number }>,
    totals: { totalNet: number; totalVat: number; totalGross: number },
    currency: string
): string {
    const sortedItems = [...items].sort((a, b) => a.name.localeCompare(b.name));
    const content = JSON.stringify({
        items: sortedItems.map(i => ({
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalGross: i.totalGross,
        })),
        totals,
        currency,
    });
    return createHash('sha256').update(content).digest('hex');
}

export class PublicContractService {
    async signContract(token: string, input: SignContractInput): Promise<SignContractResult> {
        const contract = await prisma.contract.findUnique({
            where: { publicToken: token },
            include: {
                client: true,
                items: { orderBy: { position: 'asc' } },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        companyInfo: {
                            select: {
                                name: true,
                                email: true,
                            },
                        },
                        settings: {
                            select: {
                                emailNotifications: true,
                                smtpHost: true,
                                smtpPort: true,
                                smtpUser: true,
                                smtpPass: true,
                                smtpFrom: true,
                                smtpConfigured: true,
                            },
                        },
                    },
                },
                signatureLog: true,
            },
        });

        if (!contract) {
            return { error: 'NOT_FOUND', message: 'Umowa nie została znaleziona' };
        }

        if (contract.signatureLog) {
            return { error: 'ALREADY_SIGNED', message: 'Umowa została już podpisana' };
        }

        if (contract.status !== 'PENDING_SIGNATURE') {
            return { error: 'INVALID_STATUS', message: 'Umowa nie oczekuje na podpis' };
        }

        const items = contract.items.map(item => ({
            name: item.name,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            totalGross: Number(item.totalGross),
        }));

        const totals = {
            totalNet: Number(contract.totalNet),
            totalVat: Number(contract.totalVat),
            totalGross: Number(contract.totalGross),
        };

        const contentHash = generateContractContentHash(items, totals, contract.currency);

        const signedData = {
            items: contract.items.map(item => ({
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
            })),
            totals,
            currency: contract.currency,
            contractNumber: contract.number,
            contractTitle: contract.title,
            clientName: contract.client.name,
        };

        const result = await prisma.$transaction(async (tx) => {
            const signatureLog = await tx.contractSignatureLog.create({
                data: {
                    contractId: contract.id,
                    ipAddress: input.ipAddress,
                    userAgent: input.userAgent,
                    contentHash,
                    signatureImage: input.signatureImage,
                    signerName: input.signerName,
                    signerEmail: input.signerEmail,
                    signedData: signedData as unknown as Prisma.InputJsonValue,
                    totalNet: contract.totalNet,
                    totalVat: contract.totalVat,
                    totalGross: contract.totalGross,
                    currency: contract.currency,
                },
            });

            await tx.contract.update({
                where: { id: contract.id },
                data: {
                    status: 'ACTIVE',
                    signedAt: new Date(),
                },
            });

            return signatureLog;
        });

        prisma.notification.create({
            data: {
                userId: contract.user.id,
                type: 'CONTRACT_SIGNED',
                title: 'Umowa podpisana',
                message: `Umowa ${contract.number} "${contract.title}" została podpisana przez ${input.signerName}`,
                link: `/dashboard/contracts/${contract.id}`,
                metadata: {
                    contractId: contract.id,
                    contractNumber: contract.number,
                    signerName: input.signerName,
                    signerEmail: input.signerEmail,
                } as unknown as Prisma.InputJsonValue,
            },
        }).catch((err: unknown) => {
            console.error('[PublicContract] Notification error:', err);
        });

        const settings = contract.user.settings;
        if (settings?.smtpConfigured && settings.smtpHost && settings.smtpUser && settings.smtpPass) {
            const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
            const smtpConfig = {
                host: settings.smtpHost,
                port: settings.smtpPort || 587,
                user: settings.smtpUser,
                pass: settings.smtpPass,
                from: settings.smtpFrom || settings.smtpUser,
            };

            emailService.sendSignatureConfirmation(
                input.signerEmail,
                {
                    contractNumber: contract.number,
                    contractTitle: contract.title,
                    signerName: input.signerName,
                    totalGross: Number(contract.totalGross),
                    currency: contract.currency,
                    contentHash: result.contentHash,
                    signedAt: result.signedAt.toISOString(),
                    publicUrl: `${frontendUrl}/contract/view/${token}`,
                    sellerName: contract.user.name || 'SmartQuote',
                    companyName: contract.user.companyInfo?.name || null,
                },
                smtpConfig
            ).catch((err: unknown) => {
                console.error('[PublicContract] Signature email error:', err);
            });
        }

        return {
            success: true,
            data: {
                signedAt: result.signedAt,
                contentHash: result.contentHash,
                signerName: result.signerName,
            },
        };
    }
}

export const publicContractService = new PublicContractService();