// src/services/public-offer/notifier.ts
import { Logger } from 'pino';
import { notificationService } from '../notification.service';
import { emailService } from '../email';
import { getEffectiveSmtpConfig } from '../settings.service';
import { triggerPostMortem } from '../shared/postmortem.utils';

export class PublicOfferNotifier {
    constructor(
        private logger: Logger,
        private frontendUrl: string,
    ) {}

    fireViewed(userId: string, data: {
        offerId: string;
        offerNumber: string;
        offerTitle: string;
        clientName: string;
    }): void {
        notificationService
            .offerViewed(userId, data)
            .catch((err: unknown) => {
                this.logger.error({ err, userId, offerId: data.offerId }, 'Failed to send viewed notification');
            });
    }

    fireAccepted(userId: string, offerId: string, totalGross: number, offer: any): void {
        triggerPostMortem(userId, offerId, 'ACCEPTED', 'public');

        notificationService
            .offerAccepted(userId, offer.user.email, {
                offerId,
                offerNumber: offer.number,
                offerTitle: offer.title,
                clientName: offer.client.name,
                totalGross,
                currency: offer.currency,
            })
            .catch((err: unknown) => {
                this.logger.error({ err, userId, offerId }, 'Failed to send acceptance notification');
            });
    }

    fireRejected(userId: string, offerId: string, reason: string | undefined, offer: any): void {
        triggerPostMortem(userId, offerId, 'REJECTED', 'public');

        notificationService
            .offerRejected(userId, offer.user.email, {
                offerId,
                offerNumber: offer.number,
                offerTitle: offer.title,
                clientName: offer.client.name,
                reason,
            })
            .catch((err: unknown) => {
                this.logger.error({ err, userId, offerId }, 'Failed to send rejection notification');
            });
    }

    fireComment(userId: string, userEmail: string, data: {
        offerId: string;
        offerNumber: string;
        offerTitle: string;
        clientName: string;
        commentPreview: string;
    }): void {
        notificationService
            .offerComment(userId, userEmail, data)
            .catch((err: unknown) => {
                this.logger.error({ err, userId, offerId: data.offerId }, 'Failed to send comment notification');
            });
    }

    fireAcceptanceEmail(userId: string, clientEmail: string | null, data: {
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
    }): void {
        if (!clientEmail) {
            this.logger.warn({ userId, offerNumber: data.offerNumber }, 'No client email for acceptance confirmation');
            return;
        }

        getEffectiveSmtpConfig(userId)
            .then((smtpConfig) => {
                if (!smtpConfig) {
                    this.logger.warn({ userId }, 'SMTP not configured');
                    return;
                }

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
            .then(() => {
                this.logger.info({ userId, clientEmail, offerNumber: data.offerNumber }, 'Acceptance email sent');
            })
            .catch((err: unknown) => {
                this.logger.error({ err, userId, clientEmail }, 'Failed to send acceptance email');
            });
    }
}