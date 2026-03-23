// smartquote_backend/src/services/notification.service.ts
import { NotificationType } from '@prisma/client';
import prisma from '../lib/prisma';
import { emailService } from './email.service';
import { getDecryptedSmtpConfig } from './settings.service';
import type { SmtpConfig } from '../types';

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

interface FollowUpReminderNotificationData {
    followUpId: string;
    followUpTitle: string;
    dueDate: string;
    priority: string;
    type: string;
    clientName: string | null;
    offerNumber: string | null;
    contractNumber: string | null;
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

    private async getSmtpIfEnabled(userId: string): Promise<SmtpConfig | null> {
        const settings = await prisma.userSettings.findUnique({
            where: { userId },
            select: {
                emailNotifications: true,
                offerNotifications: true,
                smtpConfigured: true,
            },
        });

        if (!settings) return null;
        if (!settings.emailNotifications || !settings.offerNotifications) return null;
        if (!settings.smtpConfigured) return null;

        try {
            return await getDecryptedSmtpConfig(userId);
        } catch (err: unknown) {
            console.error('❌ Failed to get SMTP config for user:', userId, err);
            return null;
        }
    }

    private async getSmtpForFollowUps(userId: string): Promise<SmtpConfig | null> {
        const settings = await prisma.userSettings.findUnique({
            where: { userId },
            select: {
                emailNotifications: true,
                followUpReminders: true,
                smtpConfigured: true,
            },
        });

        if (!settings) return null;
        if (!settings.emailNotifications || !settings.followUpReminders) return null;
        if (!settings.smtpConfigured) return null;

        try {
            return await getDecryptedSmtpConfig(userId);
        } catch (err: unknown) {
            console.error('❌ Failed to get SMTP config for user:', userId, err);
            return null;
        }
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
        } catch (error: unknown) {
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

            const smtp = await this.getSmtpIfEnabled(userId);
            if (smtp) {
                emailService.sendOfferAccepted(userEmail, data, smtp).catch((err: unknown) => {
                    console.error('❌ Email failed (offerAccepted):', err);
                });
            }
        } catch (error: unknown) {
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

            const smtp = await this.getSmtpIfEnabled(userId);
            if (smtp) {
                emailService.sendOfferRejected(userEmail, data, smtp).catch((err: unknown) => {
                    console.error('❌ Email failed (offerRejected):', err);
                });
            }
        } catch (error: unknown) {
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

            const smtp = await this.getSmtpIfEnabled(userId);
            if (smtp) {
                emailService.sendNewComment(userEmail, {
                    ...data,
                    commentPreview: preview,
                }, smtp).catch((err: unknown) => {
                    console.error('❌ Email failed (offerComment):', err);
                });
            }
        } catch (error: unknown) {
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
        } catch (error: unknown) {
            console.error('❌ Notification error (aiInsight):', error);
        }
    }

    async followUpReminder(userId: string, userEmail: string, data: FollowUpReminderNotificationData): Promise<void> {
        try {
            const contextParts: string[] = [];
            if (data.clientName) contextParts.push(`Klient: ${data.clientName}`);
            if (data.offerNumber) contextParts.push(`Oferta: ${data.offerNumber}`);
            if (data.contractNumber) contextParts.push(`Umowa: ${data.contractNumber}`);

            const context = contextParts.length > 0 ? ` (${contextParts.join(', ')})` : '';

            const dueDateFormatted = new Date(data.dueDate).toLocaleDateString('pl-PL', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
            });

            const typeLabels: Record<string, string> = {
                CALL: 'Telefon',
                EMAIL: 'Email',
                MEETING: 'Spotkanie',
                TASK: 'Zadanie',
                REMINDER: 'Przypomnienie',
                OTHER: 'Inne',
            };

            const typeLabel = typeLabels[data.type] || data.type;

            await this.createRecord({
                userId,
                type: 'FOLLOW_UP_REMINDER',
                title: `⏰ Zaległy follow-up: ${data.followUpTitle}`,
                message: `Follow-up "${data.followUpTitle}" (${typeLabel}) miał termin ${dueDateFormatted}${context}`,
                link: '/dashboard/followups',
                metadata: {
                    followUpId: data.followUpId,
                    priority: data.priority,
                    type: data.type,
                },
            });

            const smtp = await this.getSmtpForFollowUps(userId);
            if (smtp) {
                emailService.sendFollowUpReminder(userEmail, {
                    followUpTitle: data.followUpTitle,
                    dueDateFormatted,
                    priority: data.priority,
                    type: data.type,
                    clientName: data.clientName,
                    offerNumber: data.offerNumber,
                    contractNumber: data.contractNumber,
                }, smtp).catch((err: unknown) => {
                    console.error('❌ Email failed (followUpReminder):', err);
                });
            }
        } catch (error: unknown) {
            console.error('❌ Notification error (followUpReminder):', error);
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