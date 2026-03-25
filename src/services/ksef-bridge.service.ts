// src/services/ksef-bridge.service.ts

import prisma from '../lib/prisma';

interface KsefMasterResponse {
    draftId?: string;
    message?: string;
}

function calculateDueDate(paymentDays: number): string {
    const date = new Date();
    date.setDate(date.getDate() + paymentDays);
    return date.toISOString().split('T')[0];
}

export class KsefBridgeService {
    async getPreviewData(offerId: string, userId: string) {
        const offer = await prisma.offer.findFirst({
            where: { id: offerId, userId, status: 'ACCEPTED' },
            include: {
                client: true,
                items: { orderBy: { position: 'asc' } },
                user: {
                    select: {
                        companyInfo: true,
                    },
                },
            },
        });

        if (!offer) return null;

        const activeItems = offer.items.filter((item) => item.isSelected);
        const today = new Date().toISOString().split('T')[0];

        return {
            offer: {
                id: offer.id,
                number: offer.number,
                title: offer.title,
                totalNet: Number(offer.totalNet),
                totalVat: Number(offer.totalVat),
                totalGross: Number(offer.totalGross),
                currency: offer.currency,
                paymentDays: offer.paymentDays,
                invoiceSentAt: offer.invoiceSentAt?.toISOString() || null,
            },
            suggestedIssueDate: today,
            suggestedDueDate: calculateDueDate(offer.paymentDays),
            seller: {
                name: offer.user.companyInfo?.name || '',
                nip: offer.user.companyInfo?.nip || '',
                address: offer.user.companyInfo?.address || '',
                city: offer.user.companyInfo?.city || '',
                postalCode: offer.user.companyInfo?.postalCode || '',
            },
            buyer: {
                name: offer.client.name,
                nip: offer.client.nip || '',
                address: offer.client.address || '',
                city: offer.client.city || '',
                postalCode: offer.client.postalCode || '',
            },
            items: activeItems.map((item) => ({
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
        };
    }

    async sendToKsefMaster(
        offerId: string,
        userId: string,
        issueDate: string,
        dueDate: string
    ) {
        const offer = await prisma.offer.findFirst({
            where: { id: offerId, userId, status: 'ACCEPTED' },
            include: {
                client: true,
                items: {
                    where: { isSelected: true },
                    orderBy: { position: 'asc' },
                },
                user: {
                    select: { companyInfo: true },
                },
            },
        });

        if (!offer) throw new Error('OFFER_NOT_FOUND');
        if (offer.invoiceSentAt) throw new Error('ALREADY_SENT');
        if (!offer.user.companyInfo?.nip) throw new Error('SELLER_NIP_MISSING');
        if (!offer.client.nip) throw new Error('BUYER_NIP_MISSING');
        if (offer.items.length === 0) throw new Error('NO_ITEMS');

        const ksefMasterUrl = process.env.KSEF_MASTER_URL;
        const apiKey = process.env.KSEF_MASTER_API_KEY;

        if (!ksefMasterUrl || !apiKey) throw new Error('KSEF_NOT_CONFIGURED');

        const payload = {
            smartQuoteId: offer.id,
            offerNumber: offer.number,
            issueDate,
            dueDate,
            seller: {
                name: offer.user.companyInfo.name || '',
                nip: offer.user.companyInfo.nip,
                address: offer.user.companyInfo.address || '',
                city: offer.user.companyInfo.city || '',
                postalCode: offer.user.companyInfo.postalCode || '',
            },
            buyer: {
                name: offer.client.name,
                nip: offer.client.nip,
                address: offer.client.address || '',
                city: offer.client.city || '',
                postalCode: offer.client.postalCode || '',
            },
            items: offer.items.map((item) => ({
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
            totalNet: Number(offer.totalNet),
            totalVat: Number(offer.totalVat),
            totalGross: Number(offer.totalGross),
            currency: offer.currency,
            paymentDays: offer.paymentDays,
        };

        const response = await fetch(`${ksefMasterUrl}/api/v1/import/smartquote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorBody = await response.text().catch(() => '');
            let errorMessage = 'KSEF_MASTER_ERROR';
            try {
                const errorJson = JSON.parse(errorBody) as KsefMasterResponse;
                errorMessage = errorJson.message || errorMessage;
            } catch {
                // keep default
            }
            throw new Error(errorMessage);
        }

        const result = (await response.json()) as KsefMasterResponse;

        await prisma.offer.update({
            where: { id: offerId },
            data: {
                invoiceSentAt: new Date(),
                invoiceExternalId: result.draftId || null,
            },
        });

        return { success: true, draftId: result.draftId };
    }

    async handleWebhook(
        smartQuoteId: string,
        action: string,
        externalId?: string
    ) {
        const offer = await prisma.offer.findFirst({
            where: { id: smartQuoteId },
            select: { id: true, invoiceSentAt: true },
        });

        if (!offer) throw new Error('OFFER_NOT_FOUND');

        if (action === 'rejected') {
            await prisma.offer.update({
                where: { id: smartQuoteId },
                data: {
                    invoiceSentAt: null,
                    invoiceExternalId: null,
                },
            });
        } else if (action === 'approved' && externalId) {
            await prisma.offer.update({
                where: { id: smartQuoteId },
                data: {
                    invoiceExternalId: externalId,
                },
            });
        }

        return { acknowledged: true };
    }
}

export const ksefBridgeService = new KsefBridgeService();