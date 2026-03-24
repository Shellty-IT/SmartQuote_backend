"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const email_1 = require("./email");
const settings_service_1 = require("./settings.service");
class NotificationService {
    async createRecord(data) {
        return prisma_1.default.notification.create({
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
    async getSmtpIfEnabled(userId) {
        const settings = await prisma_1.default.userSettings.findUnique({
            where: { userId },
            select: {
                emailNotifications: true,
                offerNotifications: true,
                smtpConfigured: true,
            },
        });
        if (!settings)
            return null;
        if (!settings.emailNotifications || !settings.offerNotifications)
            return null;
        if (!settings.smtpConfigured)
            return null;
        try {
            return await (0, settings_service_1.getDecryptedSmtpConfig)(userId);
        }
        catch (err) {
            console.error('❌ Failed to get SMTP config for user:', userId, err);
            return null;
        }
    }
    async getSmtpForFollowUps(userId) {
        const settings = await prisma_1.default.userSettings.findUnique({
            where: { userId },
            select: {
                emailNotifications: true,
                followUpReminders: true,
                smtpConfigured: true,
            },
        });
        if (!settings)
            return null;
        if (!settings.emailNotifications || !settings.followUpReminders)
            return null;
        if (!settings.smtpConfigured)
            return null;
        try {
            return await (0, settings_service_1.getDecryptedSmtpConfig)(userId);
        }
        catch (err) {
            console.error('❌ Failed to get SMTP config for user:', userId, err);
            return null;
        }
    }
    async offerViewed(userId, data) {
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
        }
        catch (error) {
            console.error('❌ Notification error (offerViewed):', error);
        }
    }
    async offerAccepted(userId, userEmail, data) {
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
                email_1.emailService.sendOfferAccepted(userEmail, data, smtp).catch((err) => {
                    console.error('❌ Email failed (offerAccepted):', err);
                });
            }
        }
        catch (error) {
            console.error('❌ Notification error (offerAccepted):', error);
        }
    }
    async offerRejected(userId, userEmail, data) {
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
                email_1.emailService.sendOfferRejected(userEmail, data, smtp).catch((err) => {
                    console.error('❌ Email failed (offerRejected):', err);
                });
            }
        }
        catch (error) {
            console.error('❌ Notification error (offerRejected):', error);
        }
    }
    async offerComment(userId, userEmail, data) {
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
                email_1.emailService.sendNewComment(userEmail, {
                    ...data,
                    commentPreview: preview,
                }, smtp).catch((err) => {
                    console.error('❌ Email failed (offerComment):', err);
                });
            }
        }
        catch (error) {
            console.error('❌ Notification error (offerComment):', error);
        }
    }
    async aiInsight(userId, data) {
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
        }
        catch (error) {
            console.error('❌ Notification error (aiInsight):', error);
        }
    }
    async followUpReminder(userId, userEmail, data) {
        try {
            const contextParts = [];
            if (data.clientName)
                contextParts.push(`Klient: ${data.clientName}`);
            if (data.offerNumber)
                contextParts.push(`Oferta: ${data.offerNumber}`);
            if (data.contractNumber)
                contextParts.push(`Umowa: ${data.contractNumber}`);
            const context = contextParts.length > 0 ? ` (${contextParts.join(', ')})` : '';
            const dueDateFormatted = new Date(data.dueDate).toLocaleDateString('pl-PL', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
            });
            const typeLabels = {
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
                email_1.emailService.sendFollowUpReminder(userEmail, {
                    followUpTitle: data.followUpTitle,
                    dueDateFormatted,
                    priority: data.priority,
                    type: data.type,
                    clientName: data.clientName,
                    offerNumber: data.offerNumber,
                    contractNumber: data.contractNumber,
                }, smtp).catch((err) => {
                    console.error('❌ Email failed (followUpReminder):', err);
                });
            }
        }
        catch (error) {
            console.error('❌ Notification error (followUpReminder):', error);
        }
    }
    async list(userId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [notifications, total] = await Promise.all([
            prisma_1.default.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma_1.default.notification.count({ where: { userId } }),
        ]);
        return { notifications, total, page, limit };
    }
    async markAsRead(userId, notificationId) {
        return prisma_1.default.notification.updateMany({
            where: { id: notificationId, userId },
            data: { isRead: true },
        });
    }
    async markAllAsRead(userId) {
        return prisma_1.default.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
    }
    async getUnreadCount(userId) {
        return prisma_1.default.notification.count({
            where: { userId, isRead: false },
        });
    }
    async deleteNotification(userId, notificationId) {
        return prisma_1.default.notification.deleteMany({
            where: { id: notificationId, userId },
        });
    }
}
exports.notificationService = new NotificationService();
