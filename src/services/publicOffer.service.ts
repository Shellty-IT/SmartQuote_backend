// src/services/publicOffer.service.ts
import { Prisma } from '@prisma/client';
import { publicOfferRepository } from '../repositories/publicOffer.repository';
import { generateContentHash } from '../utils/contentHash';
import { createModuleLogger } from '../lib/logger';
import { config } from '../config';
import { PublicOfferCalculator, publicOfferCalculator } from './public-offer/calculator';
import { PublicOfferNotifier } from './public-offer/notifier';

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
    private readonly logger = createModuleLogger('public-offer-service');
    private readonly calculator: PublicOfferCalculator;
    private readonly notifier: PublicOfferNotifier;

    constructor() {
        this.calculator = publicOfferCalculator;
        this.notifier = new PublicOfferNotifier(this.logger, config.frontendUrl);
    }

    async getOfferByToken(token: string) {
        this.logger.debug({ token }, 'Getting offer by token');

        const offer = await publicOfferRepository.findByTokenFull(token);
        if (!offer) {
            this.logger.warn({ token }, 'Offer not found');
            return null;
        }

        const variantNames = [
            ...new Set(offer.items.filter((item) => item.variantName).map((item) => item.variantName!)),
        ];

        this.logger.info({ offerId: offer.id }, 'Offer retrieved');

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
            offer: this.formatOffer(offer),
        };
    }

    async registerView(token: string, ipAddress?: string, userAgent?: string) {
        this.logger.debug({ token }, 'Registering view');

        const offer = await publicOfferRepository.findByTokenForView(token);
        if (!offer || isExpired(offer.validUntil)) {
            this.logger.warn({ token }, 'Offer not found or expired');
            return null;
        }

        const isFirstView = offer.status === 'SENT';
        await publicOfferRepository.registerViewTransaction(offer.id, isFirstView, ipAddress ?? null, userAgent ?? null);

        this.logger.info({ offerId: offer.id, isFirstView }, 'View registered');

        if (isFirstView) {
            this.notifier.fireViewed(offer.userId, {
                offerId: offer.id,
                offerNumber: offer.number,
                offerTitle: offer.title,
                clientName: offer.client.name,
            });
        }

        return true;
    }

    async acceptOffer(options: AcceptOfferOptions) {
        const { token, selectedItems, selectedVariant, ipAddress, userAgent, clientName, clientEmail } = options;

        this.logger.info({ token, selectedVariant }, 'Processing acceptance');

        const offer = await publicOfferRepository.findByTokenForAccept(token);

        if (!offer) return { error: 'NOT_FOUND' as const };
        if (isDecided(offer.status)) return { error: 'ALREADY_DECIDED' as const };
        if (isExpired(offer.validUntil)) return { error: 'EXPIRED' as const };

        const calculation = this.calculator.calculate(offer.items, selectedItems, selectedVariant);
        const acceptedAt = new Date();
        const auditLog = this.buildAuditLog(offer, calculation, acceptedAt, selectedVariant, ipAddress, userAgent, clientName, clientEmail);

        await publicOfferRepository.acceptOfferTransaction(
            offer.id,
            acceptedAt,
            { selectedVariant: selectedVariant ?? null, items: calculation.clientSelectedData } as unknown as Prisma.InputJsonValue,
            {
                selectedVariant: selectedVariant ?? null,
                selectedItems: calculation.clientSelectedData,
                totalNet: calculation.netValue,
                totalVat: calculation.vatValue,
                totalGross: calculation.grossValue,
            } as unknown as Prisma.InputJsonValue,
            auditLog,
        );

        this.logger.info({ offerId: offer.id, totalGross: calculation.grossValue }, 'Offer accepted');

        this.notifier.fireAccepted(offer.user.id, offer.id, calculation.grossValue, offer);

        if (offer.requireAuditTrail && auditLog?.contentHash) {
            this.notifier.fireAcceptanceEmail(offer.user.id, clientEmail ?? offer.client.email, {
                offerNumber: offer.number,
                offerTitle: offer.title,
                clientName: clientName ?? offer.client.name,
                totalGross: calculation.grossValue,
                currency: offer.currency,
                contentHash: auditLog.contentHash,
                acceptedAt: acceptedAt.toISOString(),
                selectedVariant: selectedVariant ?? null,
                publicToken: token,
                sellerName: offer.user.name ?? offer.user.email,
                companyName: offer.user.companyInfo?.name ?? null,
            });
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
                totalNet: calculation.netValue,
                totalVat: calculation.vatValue,
                totalGross: calculation.grossValue,
                selectedItems: calculation.clientSelectedData.filter((i) => i.isSelected),
                sellerEmail: offer.user.email,
                sellerName: offer.user.name,
                userId: offer.user.id,
                auditTrail: offer.requireAuditTrail
                    ? {
                        contentHash: auditLog?.contentHash,
                        ipAddress: ipAddress ?? 'unknown',
                        acceptedAt: acceptedAt.toISOString(),
                    }
                    : null,
            },
        };
    }

    async rejectOffer(token: string, reason?: string) {
        this.logger.info({ token, reason }, 'Processing rejection');

        const offer = await publicOfferRepository.findByTokenForReject(token);

        if (!offer) return { error: 'NOT_FOUND' as const };
        if (isDecided(offer.status)) return { error: 'ALREADY_DECIDED' as const };
        if (isExpired(offer.validUntil)) return { error: 'EXPIRED' as const };

        await publicOfferRepository.rejectOfferTransaction(offer.id, reason ?? null);

        this.logger.info({ offerId: offer.id }, 'Offer rejected');

        this.notifier.fireRejected(offer.user.id, offer.id, reason, offer);

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
        this.logger.debug({ token }, 'Adding comment');

        const offer = await publicOfferRepository.findByTokenForComment(token);
        if (!offer || isExpired(offer.validUntil)) return null;

        const comment = await publicOfferRepository.addCommentTransaction(offer.id, content);

        this.logger.info({ offerId: offer.id, commentId: comment.id }, 'Comment added');

        this.notifier.fireComment(offer.userId, offer.user.email, {
            offerId: offer.id,
            offerNumber: offer.number,
            offerTitle: offer.title,
            clientName: offer.client.name,
            commentPreview: content,
        });

        return { comment, userId: offer.userId, offerNumber: offer.number };
    }

    async trackSelection(
        token: string,
        items: Array<{ id: string; isSelected: boolean; quantity: number }>,
        selectedVariant?: string,
    ) {
        const offer = await publicOfferRepository.findByTokenForTracking(token);
        if (!offer || isExpired(offer.validUntil)) return null;

        await publicOfferRepository.trackSelectionInteraction(offer.id, items, selectedVariant ?? null);
        return true;
    }

    private formatOffer(offer: NonNullable<Awaited<ReturnType<typeof publicOfferRepository.findByTokenFull>>>) {
        return {
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
            client: { name: offer.client.name, company: offer.client.company },
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
            comments: offer.comments.map((c) => ({ id: c.id, author: c.author, content: c.content, createdAt: c.createdAt })),
        };
    }

    private buildAuditLog(
        offer: any,
        calculation: ReturnType<PublicOfferCalculator['calculate']>,
        acceptedAt: Date,
        selectedVariant?: string,
        ipAddress?: string,
        userAgent?: string,
        clientName?: string,
        clientEmail?: string,
    ): Parameters<typeof publicOfferRepository.acceptOfferTransaction>[4] {
        if (!offer.requireAuditTrail) return null;

        const contentHash = generateContentHash({
            offerNumber: offer.number,
            items: calculation.clientSelectedData.map((item) => ({
                name: item.name,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                vatRate: item.vatRate,
                discount: item.discount,
                isSelected: item.isSelected,
                variantName: item.variantName,
            })),
            selectedVariant: selectedVariant ?? null,
            totalNet: calculation.netValue,
            totalVat: calculation.vatValue,
            totalGross: calculation.grossValue,
            currency: offer.currency,
        });

        return {
            ipAddress: ipAddress ?? 'unknown',
            userAgent: userAgent ?? 'unknown',
            contentHash,
            acceptedData: {
                selectedVariant: selectedVariant ?? null,
                items: calculation.clientSelectedData,
            } as unknown as Prisma.InputJsonValue,
            clientName: clientName ?? offer.client.name,
            clientEmail: clientEmail ?? offer.client.email ?? '',
            selectedVariant: selectedVariant ?? null,
            totalNet: calculation.netValue,
            totalVat: calculation.vatValue,
            totalGross: calculation.grossValue,
            currency: offer.currency,
        };
    }
}

export const publicOfferService = new PublicOfferService();