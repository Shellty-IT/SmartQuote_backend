"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicOfferService = exports.PublicOfferService = void 0;
// src/services/publicOffer.service.ts
const prisma_1 = __importDefault(require("../lib/prisma"));
const library_1 = require("@prisma/client/runtime/library");
const notification_service_1 = require("./notification.service");
const email_1 = require("./email");
const settings_service_1 = require("./settings.service");
const contentHash_1 = require("../utils/contentHash");
const postmortem_utils_1 = require("./shared/postmortem.utils");
class PublicOfferService {
    sendAcceptanceConfirmationEmail(userId, clientEmail, data) {
        const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
        (0, settings_service_1.getDecryptedSmtpConfig)(userId)
            .then((smtpConfig) => {
            if (!smtpConfig) {
                console.log('ℹ️ No SMTP config for acceptance confirmation email');
                return;
            }
            return email_1.emailService.sendAcceptanceConfirmation(clientEmail, {
                offerNumber: data.offerNumber,
                offerTitle: data.offerTitle,
                clientName: data.clientName,
                totalGross: data.totalGross,
                currency: data.currency,
                contentHash: data.contentHash,
                acceptedAt: data.acceptedAt,
                selectedVariant: data.selectedVariant,
                publicUrl: `${frontendUrl}/offer/view/${data.publicToken}`,
                sellerName: data.sellerName,
                companyName: data.companyName,
            }, smtpConfig);
        })
            .then(() => {
            console.log(`✅ Acceptance confirmation sent to ${clientEmail}`);
        })
            .catch((err) => {
            console.error('❌ Acceptance confirmation email failed:', err);
        });
    }
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
                                primaryColor: true,
                            },
                        },
                    },
                },
                comments: {
                    orderBy: { createdAt: 'asc' },
                },
                acceptanceLog: {
                    select: {
                        contentHash: true,
                        acceptedAt: true,
                        selectedVariant: true,
                        totalGross: true,
                        currency: true,
                    },
                },
            },
        });
        if (!offer)
            return null;
        const isExpired = offer.validUntil
            ? new Date(offer.validUntil) < new Date()
            : false;
        const variantNames = [...new Set(offer.items
                .filter((item) => item.variantName)
                .map((item) => item.variantName))];
        return {
            expired: isExpired,
            decided: offer.status === 'ACCEPTED' || offer.status === 'REJECTED',
            requireAuditTrail: offer.requireAuditTrail,
            variants: variantNames,
            acceptanceLog: offer.acceptanceLog ? {
                contentHash: offer.acceptanceLog.contentHash,
                acceptedAt: offer.acceptanceLog.acceptedAt,
                selectedVariant: offer.acceptanceLog.selectedVariant,
                totalGross: offer.acceptanceLog.totalGross,
                currency: offer.acceptanceLog.currency,
            } : null,
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
                    primaryColor: offer.user.companyInfo?.primaryColor || null,
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
        if (!offer)
            return null;
        if (offer.validUntil && new Date(offer.validUntil) < new Date()) {
            return null;
        }
        const isFirstView = offer.status === 'SENT';
        const statusUpdate = {
            viewCount: { increment: 1 },
            lastViewedAt: new Date(),
        };
        if (isFirstView) {
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
        if (isFirstView) {
            notification_service_1.notificationService.offerViewed(offer.userId, {
                offerId: offer.id,
                offerNumber: offer.number,
                offerTitle: offer.title,
                clientName: offer.client.name,
            }).catch((err) => {
                console.error('❌ Notification failed (offerViewed):', err);
            });
        }
        return true;
    }
    async acceptOffer(options) {
        const { token, selectedItems, selectedVariant, ipAddress, userAgent, clientName, clientEmail } = options;
        const offer = await prisma_1.default.offer.findFirst({
            where: { publicToken: token, isInteractive: true },
            include: {
                items: { orderBy: { position: 'asc' } },
                client: { select: { id: true, name: true, company: true, email: true } },
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        companyInfo: {
                            select: { name: true },
                        },
                    },
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
        const hasVariants = offer.items.some((item) => item.variantName);
        const visibleItems = hasVariants
            ? offer.items.filter((item) => !item.variantName || item.variantName === selectedVariant)
            : offer.items;
        let totalNet = new library_1.Decimal(0);
        let totalVat = new library_1.Decimal(0);
        let totalGross = new library_1.Decimal(0);
        const clientSelectedData = visibleItems.map((item) => {
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
                variantName: item.variantName,
            };
        });
        const netValue = totalNet.toDecimalPlaces(2).toNumber();
        const vatValue = totalVat.toDecimalPlaces(2).toNumber();
        const grossValue = totalGross.toDecimalPlaces(2).toNumber();
        const acceptedAt = new Date();
        let contentHash = null;
        const transactionOps = [
            prisma_1.default.offer.update({
                where: { id: offer.id },
                data: {
                    status: 'ACCEPTED',
                    acceptedAt,
                    clientSelectedData: {
                        selectedVariant: selectedVariant || null,
                        items: clientSelectedData,
                    },
                },
            }),
            prisma_1.default.offerInteraction.create({
                data: {
                    offerId: offer.id,
                    type: 'ACCEPT',
                    details: {
                        selectedVariant: selectedVariant || null,
                        selectedItems: clientSelectedData,
                        totalNet: netValue,
                        totalVat: vatValue,
                        totalGross: grossValue,
                    },
                },
            }),
        ];
        if (offer.requireAuditTrail) {
            contentHash = (0, contentHash_1.generateContentHash)({
                offerNumber: offer.number,
                items: clientSelectedData.map((item) => ({
                    name: item.name,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    vatRate: item.vatRate,
                    discount: item.discount,
                    isSelected: item.isSelected,
                    variantName: item.variantName,
                })),
                selectedVariant: selectedVariant || null,
                totalNet: netValue,
                totalVat: vatValue,
                totalGross: grossValue,
                currency: offer.currency,
            });
            transactionOps.push(prisma_1.default.offerAcceptanceLog.create({
                data: {
                    offerId: offer.id,
                    ipAddress: ipAddress || 'unknown',
                    userAgent: userAgent || 'unknown',
                    contentHash: contentHash || '',
                    acceptedData: {
                        selectedVariant: selectedVariant || null,
                        items: clientSelectedData,
                    },
                    clientName: clientName || offer.client.name,
                    clientEmail: clientEmail || offer.client.email,
                    selectedVariant: selectedVariant || null,
                    totalNet: netValue,
                    totalVat: vatValue,
                    totalGross: grossValue,
                    currency: offer.currency,
                },
            }));
        }
        await prisma_1.default.$transaction(transactionOps);
        (0, postmortem_utils_1.triggerPostMortem)(offer.user.id, offer.id, 'ACCEPTED', 'public');
        notification_service_1.notificationService.offerAccepted(offer.user.id, offer.user.email, {
            offerId: offer.id,
            offerNumber: offer.number,
            offerTitle: offer.title,
            clientName: offer.client.name,
            totalGross: grossValue,
            currency: offer.currency,
        }).catch((err) => {
            console.error('❌ Notification failed (offerAccepted):', err);
        });
        if (offer.requireAuditTrail && contentHash) {
            const recipientEmail = clientEmail || offer.client.email;
            if (recipientEmail) {
                this.sendAcceptanceConfirmationEmail(offer.user.id, recipientEmail, {
                    offerNumber: offer.number,
                    offerTitle: offer.title,
                    clientName: clientName || offer.client.name,
                    totalGross: grossValue,
                    currency: offer.currency,
                    contentHash: contentHash || '',
                    acceptedAt: acceptedAt.toISOString(),
                    selectedVariant: selectedVariant || null,
                    publicToken: token,
                    sellerName: offer.user.name || offer.user.email,
                    companyName: offer.user.companyInfo?.name || null,
                });
            }
        }
        return {
            success: true,
            data: {
                offerId: offer.id,
                offerNumber: offer.number,
                offerTitle: offer.title,
                clientName: offer.client.name,
                clientCompany: offer.client.company,
                clientEmail: offer.client.email,
                selectedVariant: selectedVariant || null,
                totalNet: netValue,
                totalVat: vatValue,
                totalGross: grossValue,
                selectedItems: clientSelectedData.filter((i) => i.isSelected),
                sellerEmail: offer.user.email,
                sellerName: offer.user.name,
                userId: offer.user.id,
                auditTrail: offer.requireAuditTrail ? {
                    contentHash,
                    ipAddress: ipAddress || 'unknown',
                    acceptedAt: acceptedAt.toISOString(),
                } : null,
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
        (0, postmortem_utils_1.triggerPostMortem)(offer.user.id, offer.id, 'REJECTED', 'public');
        notification_service_1.notificationService.offerRejected(offer.user.id, offer.user.email, {
            offerId: offer.id,
            offerNumber: offer.number,
            offerTitle: offer.title,
            clientName: offer.client.name,
            reason: reason || undefined,
        }).catch((err) => {
            console.error('❌ Notification failed (offerRejected):', err);
        });
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
                title: true,
                client: { select: { name: true } },
                user: { select: { email: true } },
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
        notification_service_1.notificationService.offerComment(offer.userId, offer.user.email, {
            offerId: offer.id,
            offerNumber: offer.number,
            offerTitle: offer.title,
            clientName: offer.client.name,
            commentPreview: content,
        }).catch((err) => {
            console.error('❌ Notification failed (offerComment):', err);
        });
        return {
            comment,
            userId: offer.userId,
            offerNumber: offer.number,
        };
    }
    async trackSelection(token, items, selectedVariant) {
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
                details: { items, selectedVariant: selectedVariant || null },
            },
        });
        return true;
    }
}
exports.PublicOfferService = PublicOfferService;
exports.publicOfferService = new PublicOfferService();
