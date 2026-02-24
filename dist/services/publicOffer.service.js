"use strict";
// smartquote_backend/src/services/publicOffer.service.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicOfferService = exports.PublicOfferService = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const library_1 = require("@prisma/client/runtime/library");
class PublicOfferService {
    async getOfferByToken(token) {
        const offer = await prisma_1.default.offer.findFirst({
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
        if (!offer)
            return null;
        const isExpired = offer.validUntil
            ? new Date(offer.validUntil) < new Date()
            : false;
        return {
            expired: isExpired,
            decided: offer.status === 'ACCEPTED' || offer.status === 'REJECTED',
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
    async registerView(token, ipAddress, userAgent) {
        const offer = await prisma_1.default.offer.findFirst({
            where: { publicToken: token, isInteractive: true },
            select: { id: true, validUntil: true, status: true },
        });
        if (!offer)
            return null;
        if (offer.validUntil && new Date(offer.validUntil) < new Date()) {
            return null;
        }
        const statusUpdate = {
            viewCount: { increment: 1 },
            lastViewedAt: new Date(),
        };
        if (offer.status === 'SENT') {
            statusUpdate.status = 'VIEWED';
        }
        await prisma_1.default.$transaction([
            prisma_1.default.offerView.create({
                data: {
                    offerId: offer.id,
                    ipAddress: ipAddress || null,
                    userAgent: userAgent || null,
                },
            }),
            prisma_1.default.offerInteraction.create({
                data: {
                    offerId: offer.id,
                    type: 'VIEW',
                    details: { ipAddress, userAgent },
                },
            }),
            prisma_1.default.offer.update({
                where: { id: offer.id },
                data: statusUpdate,
            }),
        ]);
        return true;
    }
    async acceptOffer(token, selectedItems) {
        const offer = await prisma_1.default.offer.findFirst({
            where: { publicToken: token, isInteractive: true },
            include: {
                items: { orderBy: { position: 'asc' } },
                client: { select: { id: true, name: true, company: true, email: true } },
                user: {
                    select: { id: true, email: true, name: true },
                },
            },
        });
        if (!offer)
            return { error: 'NOT_FOUND' };
        if (offer.status === 'ACCEPTED' || offer.status === 'REJECTED') {
            return { error: 'ALREADY_DECIDED' };
        }
        if (offer.validUntil && new Date(offer.validUntil) < new Date()) {
            return { error: 'EXPIRED' };
        }
        let totalNet = new library_1.Decimal(0);
        let totalVat = new library_1.Decimal(0);
        let totalGross = new library_1.Decimal(0);
        const clientSelectedData = offer.items.map((item) => {
            const selection = selectedItems.find((s) => s.id === item.id);
            const isSelected = item.isOptional
                ? (selection?.isSelected ?? item.isSelected)
                : true;
            let quantity = item.quantity;
            if (selection && typeof selection.quantity === 'number' && item.isOptional) {
                const clampedQty = Math.min(Math.max(selection.quantity, item.minQuantity), item.maxQuantity);
                quantity = new library_1.Decimal(clampedQty);
            }
            const discount = item.discount || new library_1.Decimal(0);
            const discountMultiplier = new library_1.Decimal(1).minus(discount.dividedBy(100));
            const effectivePrice = item.unitPrice.times(discountMultiplier);
            const itemNet = isSelected ? quantity.times(effectivePrice) : new library_1.Decimal(0);
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
            };
        });
        await prisma_1.default.$transaction([
            prisma_1.default.offer.update({
                where: { id: offer.id },
                data: {
                    status: 'ACCEPTED',
                    acceptedAt: new Date(),
                    clientSelectedData: clientSelectedData,
                },
            }),
            prisma_1.default.offerInteraction.create({
                data: {
                    offerId: offer.id,
                    type: 'ACCEPT',
                    details: {
                        selectedItems: clientSelectedData,
                        totalNet: totalNet.toDecimalPlaces(2).toNumber(),
                        totalVat: totalVat.toDecimalPlaces(2).toNumber(),
                        totalGross: totalGross.toDecimalPlaces(2).toNumber(),
                    },
                },
            }),
        ]);
        return {
            success: true,
            data: {
                offerId: offer.id,
                offerNumber: offer.number,
                offerTitle: offer.title,
                clientName: offer.client.name,
                clientCompany: offer.client.company,
                clientEmail: offer.client.email,
                totalNet: totalNet.toDecimalPlaces(2).toNumber(),
                totalVat: totalVat.toDecimalPlaces(2).toNumber(),
                totalGross: totalGross.toDecimalPlaces(2).toNumber(),
                selectedItems: clientSelectedData.filter((i) => i.isSelected),
                sellerEmail: offer.user.email,
                sellerName: offer.user.name,
                userId: offer.user.id,
            },
        };
    }
    async rejectOffer(token, reason) {
        const offer = await prisma_1.default.offer.findFirst({
            where: { publicToken: token, isInteractive: true },
            include: {
                client: { select: { id: true, name: true, company: true } },
                user: {
                    select: { id: true, email: true, name: true },
                },
            },
        });
        if (!offer)
            return { error: 'NOT_FOUND' };
        if (offer.status === 'ACCEPTED' || offer.status === 'REJECTED') {
            return { error: 'ALREADY_DECIDED' };
        }
        if (offer.validUntil && new Date(offer.validUntil) < new Date()) {
            return { error: 'EXPIRED' };
        }
        await prisma_1.default.$transaction([
            prisma_1.default.offer.update({
                where: { id: offer.id },
                data: {
                    status: 'REJECTED',
                    rejectedAt: new Date(),
                },
            }),
            prisma_1.default.offerInteraction.create({
                data: {
                    offerId: offer.id,
                    type: 'REJECT',
                    details: { reason: reason || null },
                },
            }),
        ]);
        return {
            success: true,
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
    async addComment(token, content) {
        const offer = await prisma_1.default.offer.findFirst({
            where: { publicToken: token, isInteractive: true },
            select: {
                id: true,
                validUntil: true,
                status: true,
                userId: true,
                number: true,
            },
        });
        if (!offer)
            return null;
        if (offer.validUntil && new Date(offer.validUntil) < new Date()) {
            return null;
        }
        const [comment] = await prisma_1.default.$transaction([
            prisma_1.default.offerComment.create({
                data: {
                    offerId: offer.id,
                    author: 'CLIENT',
                    content,
                },
            }),
            prisma_1.default.offerInteraction.create({
                data: {
                    offerId: offer.id,
                    type: 'COMMENT',
                    details: { content, author: 'CLIENT' },
                },
            }),
        ]);
        return {
            comment,
            userId: offer.userId,
            offerNumber: offer.number,
        };
    }
    async trackSelection(token, items) {
        const offer = await prisma_1.default.offer.findFirst({
            where: { publicToken: token, isInteractive: true },
            select: { id: true, validUntil: true },
        });
        if (!offer)
            return null;
        if (offer.validUntil && new Date(offer.validUntil) < new Date()) {
            return null;
        }
        await prisma_1.default.offerInteraction.create({
            data: {
                offerId: offer.id,
                type: 'ITEM_SELECT',
                details: { items },
            },
        });
        return true;
    }
}
exports.PublicOfferService = PublicOfferService;
exports.publicOfferService = new PublicOfferService();
