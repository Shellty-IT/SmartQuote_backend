// smartquote_backend/src/services/publicOffer.service.ts

import prisma from '../lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
import { aiService } from './ai.service';
import { notificationService } from './notification.service';

export class PublicOfferService {
    private triggerPostMortem(userId: string, offerId: string, outcome: 'ACCEPTED' | 'REJECTED'): void {
        aiService.generatePostMortem(userId, offerId, outcome)
            .then(() => {
                console.log(`✅ Post-mortem generated for public offer ${offerId} [${outcome}]`);
            })
            .catch((err: unknown) => {
                console.error(`❌ Post-mortem failed for public offer ${offerId}:`, err);
            });
    }

    async getOfferByToken(token: string) {
        const offer = await prisma.offer.findFirst({
            where: { publicToken: token, isInteractive: true },
            include: {
                items: { orderBy: { position: 'asc' } },
                client: {
                    select: {
                        name: true,
                        company: true,
                        email: true,
                    },
                },
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
                comments: {
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!offer) return null;

        const isExpired = offer.validUntil
            ? new Date(offer.validUntil) < new Date()
            : false;

        const variantNames = [...new Set(
            offer.items
                .filter((item) => item.variantName)
                .map((item) => item.variantName!)
        )];

        return {
            expired: isExpired,
            decided: offer.status === 'ACCEPTED' || offer.status === 'REJECTED',
            variants: variantNames,
            offer: {
                id: offer.id,
                number: offer.number,
                title: offer.title,
                description: offer.description,
                status: offer.status,
                validUntil: offer.validUntil,
                totalNet: offer.totalNet,
                totalVat: offer.totalVat,
                totalGross: offer.totalGross,
                currency: offer.currency,
                acceptedAt: offer.acceptedAt,
                rejectedAt: offer.rejectedAt,
                clientSelectedData: offer.clientSelectedData,
                terms: offer.terms,
                paymentDays: offer.paymentDays,
                createdAt: offer.createdAt,
                items: offer.items.map((item) => ({
                    id: item.id,
                    name: item.name,
                    description: item.description,
                    quantity: item.quantity,
                    unit: item.unit,
                    unitPrice: item.unitPrice,
                    vatRate: item.vatRate,
                    discount: item.discount,
                    totalNet: item.totalNet,
                    totalVat: item.totalVat,
                    totalGross: item.totalGross,
                    position: item.position,
                    isOptional: item.isOptional,
                    isSelected: item.isSelected,
                    minQuantity: item.minQuantity,
                    maxQuantity: item.maxQuantity,
                    variantName: item.variantName,
                })),
                client: {
                    name: offer.client.name,
                    company: offer.client.company,
                },
                seller: {
                    name: offer.user.name,
                    email: offer.user.email,
                    phone: offer.user.companyInfo?.phone || offer.user.phone,
                    company: offer.user.companyInfo?.name || null,
                    nip: offer.user.companyInfo?.nip || null,
                    address: offer.user.companyInfo?.address || null,
                    city: offer.user.companyInfo?.city || null,
                    postalCode: offer.user.companyInfo?.postalCode || null,
                    website: offer.user.companyInfo?.website || null,
                    logo: offer.user.companyInfo?.logo || null,
                },
                comments: offer.comments.map((c) => ({
                    id: c.id,
                    author: c.author,
                    content: c.content,
                    createdAt: c.createdAt,
                })),
            },
        };
    }

    async registerView(token: string, ipAddress?: string, userAgent?: string) {
        const offer = await prisma.offer.findFirst({
            where: { publicToken: token, isInteractive: true },
            select: {
                id: true,
                validUntil: true,
                status: true,
                userId: true,
                number: true,
                title: true,
                client: { select: { name: true } },
            },
        });

        if (!offer) return null;

        if (offer.validUntil && new Date(offer.validUntil) < new Date()) {
            return null;
        }

        const isFirstView = offer.status === 'SENT';

        const statusUpdate: Record<string, unknown> = {
            viewCount: { increment: 1 },
            lastViewedAt: new Date(),
        };

        if (isFirstView) {
            statusUpdate.status = 'VIEWED';
        }

        await prisma.$transaction([
            prisma.offerView.create({
                data: {
                    offerId: offer.id,
                    ipAddress: ipAddress || null,
                    userAgent: userAgent || null,
                },
            }),
            prisma.offerInteraction.create({
                data: {
                    offerId: offer.id,
                    type: 'VIEW',
                    details: { ipAddress, userAgent },
                },
            }),
            prisma.offer.update({
                where: { id: offer.id },
                data: statusUpdate,
            }),
        ]);

        if (isFirstView) {
            notificationService.offerViewed(offer.userId, {
                offerId: offer.id,
                offerNumber: offer.number,
                offerTitle: offer.title,
                clientName: offer.client.name,
            }).catch((err: unknown) => {
                console.error('❌ Notification failed (offerViewed):', err);
            });
        }

        return true;
    }

    async acceptOffer(
        token: string,
        selectedItems: Array<{ id: string; isSelected: boolean; quantity: number }>,
        selectedVariant?: string
    ) {
        const offer = await prisma.offer.findFirst({
            where: { publicToken: token, isInteractive: true },
            include: {
                items: { orderBy: { position: 'asc' } },
                client: { select: { id: true, name: true, company: true, email: true } },
                user: {
                    select: { id: true, email: true, name: true },
                },
            },
        });

        if (!offer) return { error: 'NOT_FOUND' as const };

        if (offer.status === 'ACCEPTED' || offer.status === 'REJECTED') {
            return { error: 'ALREADY_DECIDED' as const };
        }

        if (offer.validUntil && new Date(offer.validUntil) < new Date()) {
            return { error: 'EXPIRED' as const };
        }

        const hasVariants = offer.items.some((item) => item.variantName);
        const visibleItems = hasVariants
            ? offer.items.filter((item) => !item.variantName || item.variantName === selectedVariant)
            : offer.items;

        let totalNet = new Decimal(0);
        let totalVat = new Decimal(0);
        let totalGross = new Decimal(0);

        const clientSelectedData = visibleItems.map((item) => {
            const selection = selectedItems.find((s) => s.id === item.id);

            const isSelected = item.isOptional
                ? (selection?.isSelected ?? item.isSelected)
                : true;

            let quantity = item.quantity;
            if (selection && typeof selection.quantity === 'number' && item.isOptional) {
                const clampedQty = Math.min(
                    Math.max(selection.quantity, item.minQuantity),
                    item.maxQuantity
                );
                quantity = new Decimal(clampedQty);
            }

            const discount = item.discount || new Decimal(0);
            const discountMultiplier = new Decimal(1).minus(discount.dividedBy(100));
            const effectivePrice = item.unitPrice.times(discountMultiplier);

            const itemNet = isSelected ? quantity.times(effectivePrice) : new Decimal(0);
            const itemVat = itemNet.times(item.vatRate.dividedBy(100));
            const itemGross = itemNet.plus(itemVat);

            if (isSelected) {
                totalNet = totalNet.plus(itemNet);
                totalVat = totalVat.plus(itemVat);
                totalGross = totalGross.plus(itemGross);
            }

            return {
                itemId: item.id,
                name: item.name,
                isSelected,
                quantity: quantity.toNumber(),
                unitPrice: item.unitPrice.toNumber(),
                vatRate: item.vatRate.toNumber(),
                discount: discount.toNumber(),
                netto: itemNet.toDecimalPlaces(2).toNumber(),
                vat: itemVat.toDecimalPlaces(2).toNumber(),
                brutto: itemGross.toDecimalPlaces(2).toNumber(),
                variantName: item.variantName,
            };
        });

        await prisma.$transaction([
            prisma.offer.update({
                where: { id: offer.id },
                data: {
                    status: 'ACCEPTED',
                    acceptedAt: new Date(),
                    clientSelectedData: {
                        selectedVariant: selectedVariant || null,
                        items: clientSelectedData,
                    } as unknown as Prisma.InputJsonValue,
                },
            }),
            prisma.offerInteraction.create({
                data: {
                    offerId: offer.id,
                    type: 'ACCEPT',
                    details: {
                        selectedVariant: selectedVariant || null,
                        selectedItems: clientSelectedData,
                        totalNet: totalNet.toDecimalPlaces(2).toNumber(),
                        totalVat: totalVat.toDecimalPlaces(2).toNumber(),
                        totalGross: totalGross.toDecimalPlaces(2).toNumber(),
                    },
                },
            }),
        ]);

        this.triggerPostMortem(offer.user.id, offer.id, 'ACCEPTED');

        const grossValue = totalGross.toDecimalPlaces(2).toNumber();

        notificationService.offerAccepted(offer.user.id, offer.user.email, {
            offerId: offer.id,
            offerNumber: offer.number,
            offerTitle: offer.title,
            clientName: offer.client.name,
            totalGross: grossValue,
            currency: offer.currency,
        }).catch((err: unknown) => {
            console.error('❌ Notification failed (offerAccepted):', err);
        });

        return {
            success: true as const,
            data: {
                offerId: offer.id,
                offerNumber: offer.number,
                offerTitle: offer.title,
                clientName: offer.client.name,
                clientCompany: offer.client.company,
                clientEmail: offer.client.email,
                selectedVariant: selectedVariant || null,
                totalNet: totalNet.toDecimalPlaces(2).toNumber(),
                totalVat: totalVat.toDecimalPlaces(2).toNumber(),
                totalGross: grossValue,
                selectedItems: clientSelectedData.filter((i) => i.isSelected),
                sellerEmail: offer.user.email,
                sellerName: offer.user.name,
                userId: offer.user.id,
            },
        };
    }

    async rejectOffer(token: string, reason?: string) {
        const offer = await prisma.offer.findFirst({
            where: { publicToken: token, isInteractive: true },
            include: {
                client: { select: { id: true, name: true, company: true } },
                user: {
                    select: { id: true, email: true, name: true },
                },
            },
        });

        if (!offer) return { error: 'NOT_FOUND' as const };

        if (offer.status === 'ACCEPTED' || offer.status === 'REJECTED') {
            return { error: 'ALREADY_DECIDED' as const };
        }

        if (offer.validUntil && new Date(offer.validUntil) < new Date()) {
            return { error: 'EXPIRED' as const };
        }

        await prisma.$transaction([
            prisma.offer.update({
                where: { id: offer.id },
                data: {
                    status: 'REJECTED',
                    rejectedAt: new Date(),
                },
            }),
            prisma.offerInteraction.create({
                data: {
                    offerId: offer.id,
                    type: 'REJECT',
                    details: { reason: reason || null },
                },
            }),
        ]);

        this.triggerPostMortem(offer.user.id, offer.id, 'REJECTED');

        notificationService.offerRejected(offer.user.id, offer.user.email, {
            offerId: offer.id,
            offerNumber: offer.number,
            offerTitle: offer.title,
            clientName: offer.client.name,
            reason: reason || undefined,
        }).catch((err: unknown) => {
            console.error('❌ Notification failed (offerRejected):', err);
        });

        return {
            success: true as const,
            data: {
                offerId: offer.id,
                offerNumber: offer.number,
                clientName: offer.client.name,
                reason: reason || null,
                sellerEmail: offer.user.email,
                sellerName: offer.user.name,
                userId: offer.user.id,
            },
        };
    }

    async addComment(token: string, content: string) {
        const offer = await prisma.offer.findFirst({
            where: { publicToken: token, isInteractive: true },
            select: {
                id: true,
                validUntil: true,
                status: true,
                userId: true,
                number: true,
                title: true,
                client: { select: { name: true } },
                user: { select: { email: true } },
            },
        });

        if (!offer) return null;

        if (offer.validUntil && new Date(offer.validUntil) < new Date()) {
            return null;
        }

        const [comment] = await prisma.$transaction([
            prisma.offerComment.create({
                data: {
                    offerId: offer.id,
                    author: 'CLIENT',
                    content,
                },
            }),
            prisma.offerInteraction.create({
                data: {
                    offerId: offer.id,
                    type: 'COMMENT',
                    details: { content, author: 'CLIENT' },
                },
            }),
        ]);

        notificationService.offerComment(offer.userId, offer.user.email, {
            offerId: offer.id,
            offerNumber: offer.number,
            offerTitle: offer.title,
            clientName: offer.client.name,
            commentPreview: content,
        }).catch((err: unknown) => {
            console.error('❌ Notification failed (offerComment):', err);
        });

        return {
            comment,
            userId: offer.userId,
            offerNumber: offer.number,
        };
    }

    async trackSelection(
        token: string,
        items: Array<{ id: string; isSelected: boolean; quantity: number }>,
        selectedVariant?: string
    ) {
        const offer = await prisma.offer.findFirst({
            where: { publicToken: token, isInteractive: true },
            select: { id: true, validUntil: true },
        });

        if (!offer) return null;

        if (offer.validUntil && new Date(offer.validUntil) < new Date()) {
            return null;
        }

        await prisma.offerInteraction.create({
            data: {
                offerId: offer.id,
                type: 'ITEM_SELECT',
                details: { items, selectedVariant: selectedVariant || null },
            },
        });

        return true;
    }
}

export const publicOfferService = new PublicOfferService();