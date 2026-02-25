// smartquote_backend/src/services/notification.service.ts

import { NotificationType } from '@prisma/client';
import prisma from '../lib/prisma';
import { emailService } from './email.service';

interface OfferNotificationData {
    offerId: string;
    offerNumber: string;
    offerTitle: string;
    clientName: string;
}

interface OfferAcceptedNotificationData extends OfferNotificationData {
    totalGross: number;
    currency: string;
}

interface OfferRejectedNotificationData extends OfferNotificationData {
    reason?: string;
}

interface CommentNotificationData extends OfferNotificationData {
    commentPreview: string;
}

class NotificationService {
    private async createRecord(data: {
        userId: string;
        type: NotificationType;
        title: string;
        message: string;
        link?: string;
        metadata?: Record<string, string | number | boolean | null>;
    }) {
        return prisma.notification.create({
            data: {
                userId: data.userId,
                type: data.type,
                title: data.title,
                message: data.message,
                link: data.link,
                metadata: data.metadata ?? undefined,
            },
        });
    }

    private async shouldSendEmail(userId: string): Promise<boolean> {
        const settings = await prisma.userSettings.findUnique({
            where: { userId },
            select: { emailNotifications: true, offerNotifications: true },
        });

        if (!settings) return true;
        return settings.emailNotifications && settings.offerNotifications;
    }

    async offerViewed(userId: string, data: OfferNotificationData): Promise<void> {
        try {
            await this.createRecord({
                userId,
                type: 'OFFER_VIEWED',
                title: 'Klient otworzył ofertę',
                message: `${data.clientName} wyświetlił ofertę ${data.offerNumber} — ${data.offerTitle}`,
                link: `/dashboard/offers/${data.offerId}`,
                metadata: {
                    offerId: data.offerId,
                    offerNumber: data.offerNumber,
                },
            });
        } catch (error) {
            console.error('❌ Notification error (offerViewed):', error);
        }
    }

    async offerAccepted(userId: string, userEmail: string, data: OfferAcceptedNotificationData): Promise<void> {
        try {
            await this.createRecord({
                userId,
                type: 'OFFER_ACCEPTED',
                title: 'Oferta zaakceptowana! 🎉',
                message: `${data.clientName} zaakceptował ofertę ${data.offerNumber} — ${data.offerTitle}`,
                link: `/dashboard/offers/${data.offerId}`,
                metadata: {
                    offerId: data.offerId,
                    offerNumber: data.offerNumber,
                    totalGross: data.totalGross,
                    currency: data.currency,
                },
            });

            const canSend = await this.shouldSendEmail(userId);
            if (canSend) {
                emailService.sendOfferAccepted(userEmail, data).catch((err) => {
                    console.error('❌ Email failed (offerAccepted):', err);
                });
            }
        } catch (error) {
            console.error('❌ Notification error (offerAccepted):', error);
        }
    }

    async offerRejected(userId: string, userEmail: string, data: OfferRejectedNotificationData): Promise<void> {
        try {
            await this.createRecord({
                userId,
                type: 'OFFER_REJECTED',
                title: 'Oferta odrzucona',
                message: `${data.clientName} odrzucił ofertę ${data.offerNumber} — ${data.offerTitle}${data.reason ? `. Powód: ${data.reason}` : ''}`,
                link: `/dashboard/offers/${data.offerId}`,
                metadata: {
                    offerId: data.offerId,
                    offerNumber: data.offerNumber,
                    reason: data.reason || null,
                },
            });

            const canSend = await this.shouldSendEmail(userId);
            if (canSend) {
                emailService.sendOfferRejected(userEmail, data).catch((err) => {
                    console.error('❌ Email failed (offerRejected):', err);
                });
            }
        } catch (error) {
            console.error('❌ Notification error (offerRejected):', error);
        }
    }

    async offerComment(userId: string, userEmail: string, data: CommentNotificationData): Promise<void> {
        try {
            const preview = data.commentPreview.length > 100
                ? `${data.commentPreview.substring(0, 100)}...`
                : data.commentPreview;

            await this.createRecord({
                userId,
                type: 'OFFER_COMMENT',
                title: 'Nowy komentarz od klienta',
                message: `${data.clientName} skomentował ofertę ${data.offerNumber}: "${preview}"`,
                link: `/dashboard/offers/${data.offerId}`,
                metadata: {
                    offerId: data.offerId,
                    offerNumber: data.offerNumber,
                },
            });

            const canSend = await this.shouldSendEmail(userId);
            if (canSend) {
                emailService.sendNewComment(userEmail, {
                    ...data,
                    commentPreview: preview,
                }).catch((err) => {
                    console.error('❌ Email failed (offerComment):', err);
                });
            }
        } catch (error) {
            console.error('❌ Notification error (offerComment):', error);
        }
    }

    async aiInsight(userId: string, data: { offerId: string; offerNumber: string; outcome: string }): Promise<void> {
        try {
            await this.createRecord({
                userId,
                type: 'AI_INSIGHT',
                title: 'Nowy insight AI',
                message: `Analiza post-mortem oferty ${data.offerNumber} jest gotowa (${data.outcome === 'ACCEPTED' ? 'zaakceptowana' : 'odrzucona'})`,
                link: `/dashboard/offers/${data.offerId}`,
                metadata: {
                    offerId: data.offerId,
                    offerNumber: data.offerNumber,
                    outcome: data.outcome,
                },
            });
        } catch (error) {
            console.error('❌ Notification error (aiInsight):', error);
        }
    }

    async list(userId: string, page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;

        const [notifications, total] = await Promise.all([
            prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.notification.count({ where: { userId } }),
        ]);

        return { notifications, total, page, limit };
    }

    async markAsRead(userId: string, notificationId: string) {
        return prisma.notification.updateMany({
            where: { id: notificationId, userId },
            data: { isRead: true },
        });
    }

    async markAllAsRead(userId: string) {
        return prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
    }

    async getUnreadCount(userId: string): Promise<number> {
        return prisma.notification.count({
            where: { userId, isRead: false },
        });
    }

    async deleteNotification(userId: string, notificationId: string) {
        return prisma.notification.deleteMany({
            where: { id: notificationId, userId },
        });
    }
}

export const notificationService = new NotificationService();