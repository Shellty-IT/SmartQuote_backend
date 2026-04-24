// src/services/publicOffer.service.ts
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
import { publicOfferRepository } from '../repositories/publicOffer.repository';
import { notificationService } from './notification.service';
import { emailService } from './email';
import { getDecryptedSmtpConfig } from './settings.service';
import { generateContentHash } from '../utils/contentHash';
import { triggerPostMortem } from './shared/postmortem.utils';

interface AcceptOfferOptions {
    readonly token: string;
    readonly selectedItems: Array<{ id: string; isSelected: boolean; quantity: number }>;
    readonly selectedVariant?: string;
    readonly ipAddress?: string;
    readonly userAgent?: string;
    readonly clientName?: string;
    readonly clientEmail?: string;
}

function isExpired(validUntil: Date | null): boolean {
    return validUntil ? new Date(validUntil) < new Date() : false;
}

function isDecided(status: string): boolean {
    return status === 'ACCEPTED' || status === 'REJECTED';
}

export class PublicOfferService {
    private readonly frontendUrl: string;

    constructor() {
        this.frontendUrl = (process.env.FRONTEND_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    }

    private fireAcceptanceConfirmationEmail(
        userId: string,
        clientEmail: string,
        data: {
            offerNumber: string;
            offerTitle: string;
            clientName: string;
            totalGross: number;
            currency: string;
            contentHash: string;
            acceptedAt: string;
            selectedVariant?: string | null;
            publicToken: string;
            sellerName: string;
            companyName: string | null;
        },
    ): void {
        getDecryptedSmtpConfig(userId)
            .then((smtpConfig) => {
                if (!smtpConfig) return;
                return emailService.sendAcceptanceConfirmation(
                    clientEmail,
                    {
                        offerNumber: data.offerNumber,
                        offerTitle: data.offerTitle,
                        clientName: data.clientName,
                        totalGross: data.totalGross,
                        currency: data.currency,
                        contentHash: data.contentHash,
                        acceptedAt: data.acceptedAt,
                        selectedVariant: data.selectedVariant,
                        publicUrl: `${this.frontendUrl}/offer/view/${data.publicToken}`,
                        sellerName: data.sellerName,
                        companyName: data.companyName,
                    },
                    smtpConfig,
                );
            })
            .catch((_err: unknown) => {});
    }

    async getOfferByToken(token: string) {
        const offer = await publicOfferRepository.findByTokenFull(token);
        if (!offer) return null;

        const variantNames = [
            ...new Set(
                offer.items.filter((item) => item.variantName).map((item) => item.variantName!),
            ),
        ];

        return {
            expired: isExpired(offer.validUntil),
            decided: isDecided(offer.status),
            requireAuditTrail: offer.requireAuditTrail,
            variants: variantNames,
            acceptanceLog: offer.acceptanceLog
                ? {
                    contentHash: offer.acceptanceLog.contentHash,
                    acceptedAt: offer.acceptanceLog.acceptedAt,
                    selectedVariant: offer.acceptanceLog.selectedVariant,
                    totalGross: offer.acceptanceLog.totalGross,
                    currency: offer.acceptanceLog.currency,
                }
                : null,
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
                    phone: offer.user.companyInfo?.phone ?? offer.user.phone,
                    company: offer.user.companyInfo?.name ?? null,
                    nip: offer.user.companyInfo?.nip ?? null,
                    address: offer.user.companyInfo?.address ?? null,
                    city: offer.user.companyInfo?.city ?? null,
                    postalCode: offer.user.companyInfo?.postalCode ?? null,
                    website: offer.user.companyInfo?.website ?? null,
                    logo: offer.user.companyInfo?.logo ?? null,
                    primaryColor: offer.user.companyInfo?.primaryColor ?? null,
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
        const offer = await publicOfferRepository.findByTokenForView(token);
        if (!offer) return null;
        if (isExpired(offer.validUntil)) return null;

        const isFirstView = offer.status === 'SENT';

        await publicOfferRepository.registerViewTransaction(
            offer.id,
            isFirstView,
            ipAddress ?? null,
            userAgent ?? null,
        );

        if (isFirstView) {
            notificationService
                .offerViewed(offer.userId, {
                    offerId: offer.id,
                    offerNumber: offer.number,
                    offerTitle: offer.title,
                    clientName: offer.client.name,
                })
                .catch((_err: unknown) => {});
        }

        return true;
    }

    async acceptOffer(options: AcceptOfferOptions) {
        const { token, selectedItems, selectedVariant, ipAddress, userAgent, clientName, clientEmail } =
            options;

        const offer = await publicOfferRepository.findByTokenForAccept(token);

        if (!offer) return { error: 'NOT_FOUND' as const };
        if (isDecided(offer.status)) return { error: 'ALREADY_DECIDED' as const };
        if (isExpired(offer.validUntil)) return { error: 'EXPIRED' as const };

        const hasVariants = offer.items.some((item) => item.variantName);
        const visibleItems = hasVariants
            ? offer.items.filter((item) => !item.variantName || item.variantName === selectedVariant)
            : offer.items;

        let totalNet = new Decimal(0);
        let totalVat = new Decimal(0);
        let totalGross = new Decimal(0);

        const clientSelectedData = visibleItems.map((item) => {
            const selection = selectedItems.find((s) => s.id === item.id);
            const isSelected = item.isOptional ? (selection?.isSelected ?? item.isSelected) : true;

            let quantity = item.quantity;
            if (selection && typeof selection.quantity === 'number' && item.isOptional) {
                const clamped = Math.min(Math.max(selection.quantity, item.minQuantity), item.maxQuantity);
                quantity = new Decimal(clamped);
            }

            const discount = item.discount ?? new Decimal(0);
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

        const netValue = totalNet.toDecimalPlaces(2).toNumber();
        const vatValue = totalVat.toDecimalPlaces(2).toNumber();
        const grossValue = totalGross.toDecimalPlaces(2).toNumber();
        const acceptedAt = new Date();

        let contentHash: string | null = null;

        const auditLog: Parameters<typeof publicOfferRepository.acceptOfferTransaction>[4] =
            offer.requireAuditTrail
                ? (() => {
                    contentHash = generateContentHash({
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
                        selectedVariant: selectedVariant ?? null,
                        totalNet: netValue,
                        totalVat: vatValue,
                        totalGross: grossValue,
                        currency: offer.currency,
                    });

                    return {
                        ipAddress: ipAddress ?? 'unknown',
                        userAgent: userAgent ?? 'unknown',
                        contentHash: contentHash ?? '',
                        acceptedData: {
                            selectedVariant: selectedVariant ?? null,
                            items: clientSelectedData,
                        } as unknown as Prisma.InputJsonValue,
                        clientName: clientName ?? offer.client.name,
                        clientEmail: clientEmail ?? offer.client.email ?? '',
                        selectedVariant: selectedVariant ?? null,
                        totalNet: netValue,
                        totalVat: vatValue,
                        totalGross: grossValue,
                        currency: offer.currency,
                    };
                })()
                : null;

        await publicOfferRepository.acceptOfferTransaction(
            offer.id,
            acceptedAt,
            {
                selectedVariant: selectedVariant ?? null,
                items: clientSelectedData,
            } as unknown as Prisma.InputJsonValue,
            {
                selectedVariant: selectedVariant ?? null,
                selectedItems: clientSelectedData,
                totalNet: netValue,
                totalVat: vatValue,
                totalGross: grossValue,
            } as unknown as Prisma.InputJsonValue,
            auditLog,
        );

        triggerPostMortem(offer.user.id, offer.id, 'ACCEPTED', 'public');

        notificationService
            .offerAccepted(offer.user.id, offer.user.email, {
                offerId: offer.id,
                offerNumber: offer.number,
                offerTitle: offer.title,
                clientName: offer.client.name,
                totalGross: grossValue,
                currency: offer.currency,
            })
            .catch((_err: unknown) => {});

        if (offer.requireAuditTrail && contentHash) {
            const recipientEmail = clientEmail ?? offer.client.email;
            if (recipientEmail) {
                this.fireAcceptanceConfirmationEmail(offer.user.id, recipientEmail, {
                    offerNumber: offer.number,
                    offerTitle: offer.title,
                    clientName: clientName ?? offer.client.name,
                    totalGross: grossValue,
                    currency: offer.currency,
                    contentHash,
                    acceptedAt: acceptedAt.toISOString(),
                    selectedVariant: selectedVariant ?? null,
                    publicToken: token,
                    sellerName: offer.user.name ?? offer.user.email,
                    companyName: offer.user.companyInfo?.name ?? null,
                });
            }
        }

        return {
            success: true as const,
            data: {
                offerId: offer.id,
                offerNumber: offer.number,
                offerTitle: offer.title,
                clientName: offer.client.name,
                clientCompany: offer.client.company,
                clientEmail: offer.client.email,
                selectedVariant: selectedVariant ?? null,
                totalNet: netValue,
                totalVat: vatValue,
                totalGross: grossValue,
                selectedItems: clientSelectedData.filter((i) => i.isSelected),
                sellerEmail: offer.user.email,
                sellerName: offer.user.name,
                userId: offer.user.id,
                auditTrail: offer.requireAuditTrail
                    ? {
                        contentHash,
                        ipAddress: ipAddress ?? 'unknown',
                        acceptedAt: acceptedAt.toISOString(),
                    }
                    : null,
            },
        };
    }

    async rejectOffer(token: string, reason?: string) {
        const offer = await publicOfferRepository.findByTokenForReject(token);

        if (!offer) return { error: 'NOT_FOUND' as const };
        if (isDecided(offer.status)) return { error: 'ALREADY_DECIDED' as const };
        if (isExpired(offer.validUntil)) return { error: 'EXPIRED' as const };

        await publicOfferRepository.rejectOfferTransaction(offer.id, reason ?? null);

        triggerPostMortem(offer.user.id, offer.id, 'REJECTED', 'public');

        notificationService
            .offerRejected(offer.user.id, offer.user.email, {
                offerId: offer.id,
                offerNumber: offer.number,
                offerTitle: offer.title,
                clientName: offer.client.name,
                reason: reason ?? undefined,
            })
            .catch((_err: unknown) => {});

        return {
            success: true as const,
            data: {
                offerId: offer.id,
                offerNumber: offer.number,
                clientName: offer.client.name,
                reason: reason ?? null,
                sellerEmail: offer.user.email,
                sellerName: offer.user.name,
                userId: offer.user.id,
            },
        };
    }

    async addComment(token: string, content: string) {
        const offer = await publicOfferRepository.findByTokenForComment(token);
        if (!offer) return null;
        if (isExpired(offer.validUntil)) return null;

        const comment = await publicOfferRepository.addCommentTransaction(offer.id, content);

        notificationService
            .offerComment(offer.userId, offer.user.email, {
                offerId: offer.id,
                offerNumber: offer.number,
                offerTitle: offer.title,
                clientName: offer.client.name,
                commentPreview: content,
            })
            .catch((_err: unknown) => {});

        return {
            comment,
            userId: offer.userId,
            offerNumber: offer.number,
        };
    }

    async trackSelection(
        token: string,
        items: Array<{ id: string; isSelected: boolean; quantity: number }>,
        selectedVariant?: string,
    ) {
        const offer = await publicOfferRepository.findByTokenForTracking(token);
        if (!offer) return null;
        if (isExpired(offer.validUntil)) return null;

        await publicOfferRepository.trackSelectionInteraction(
            offer.id,
            items,
            selectedVariant ?? null,
        );

        return true;
    }
}

export const publicOfferService = new PublicOfferService();