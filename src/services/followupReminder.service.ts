// smartquote_backend/src/services/followupReminder.service.ts
import prisma from '../lib/prisma';
import { notificationService } from './notification.service';

interface ProcessResult {
    processed: number;
    errors: number;
    skipped: boolean;
}

class FollowUpReminderService {
    private lastRunAt: number = 0;
    private readonly MIN_INTERVAL_MS = 15 * 60 * 1000;
    private isRunning = false;

    async processOverdueFollowUps(): Promise<ProcessResult> {
        if (this.isRunning) {
            return { processed: 0, errors: 0, skipped: true };
        }

        this.isRunning = true;
        let processed = 0;
        let errors = 0;

        try {
            const now = new Date();

            const overdueFollowUps = await prisma.followUp.findMany({
                where: {
                    dueDate: { lte: now },
                    status: 'PENDING',
                    reminderSentAt: null,
                },
                include: {
                    client: { select: { name: true } },
                    offer: { select: { number: true, title: true } },
                    contract: { select: { number: true, title: true } },
                    user: { select: { id: true, email: true, name: true } },
                },
                orderBy: { dueDate: 'asc' },
                take: 50,
            });

            if (overdueFollowUps.length === 0) {
                return { processed: 0, errors: 0, skipped: false };
            }

            for (const followUp of overdueFollowUps) {
                try {
                    await prisma.followUp.update({
                        where: { id: followUp.id },
                        data: {
                            reminderSentAt: now,
                            status: 'OVERDUE',
                        },
                    });

                    await notificationService.followUpReminder(
                        followUp.userId,
                        followUp.user.email,
                        {
                            followUpId: followUp.id,
                            followUpTitle: followUp.title,
                            dueDate: followUp.dueDate.toISOString(),
                            priority: followUp.priority,
                            type: followUp.type,
                            clientName: followUp.client?.name || null,
                            offerNumber: followUp.offer?.number || null,
                            contractNumber: followUp.contract?.number || null,
                        }
                    );

                    processed++;
                } catch (err: unknown) {
                    console.error(`❌ Follow-up reminder failed for ${followUp.id}:`, err);
                    errors++;
                }
            }

            console.log(`📋 Follow-up reminders: ${processed} sent, ${errors} errors`);
        } catch (err: unknown) {
            console.error('❌ Follow-up reminder batch error:', err);
        } finally {
            this.isRunning = false;
            this.lastRunAt = Date.now();
        }

        return { processed, errors, skipped: false };
    }

    async tryPeriodicCheck(): Promise<ProcessResult> {
        const now = Date.now();
        if (now - this.lastRunAt < this.MIN_INTERVAL_MS) {
            return { processed: 0, errors: 0, skipped: true };
        }

        return this.processOverdueFollowUps();
    }

    getStatus(): { lastRunAt: string | null; isRunning: boolean; intervalMinutes: number } {
        return {
            lastRunAt: this.lastRunAt > 0 ? new Date(this.lastRunAt).toISOString() : null,
            isRunning: this.isRunning,
            intervalMinutes: this.MIN_INTERVAL_MS / 60000,
        };
    }
}

export const followUpReminderService = new FollowUpReminderService();