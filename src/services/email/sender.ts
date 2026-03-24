// smartquote_backend/src/services/email/sender.ts
import nodemailer from 'nodemailer';
import type { SmtpConfig } from '../../types';
import { emailTemplates } from './templates';

interface EmailOptions {
    readonly to: string;
    readonly subject: string;
    readonly html: string;
}

export class EmailSender {
    private readonly frontendUrl: string;

    constructor() {
        this.frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    }

    private createTransporter(config: SmtpConfig): nodemailer.Transporter {
        return nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.port === 465,
            auth: { user: config.user, pass: config.pass },
        });
    }

    async testConnection(config: SmtpConfig): Promise<{ success: boolean; error?: string }> {
        try {
            const transporter = this.createTransporter(config);
            await transporter.verify();
            return { success: true };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Nieznany błąd połączenia';
            return { success: false, error: message };
        }
    }

    private async send(options: EmailOptions, smtpConfig: SmtpConfig): Promise<boolean> {
        try {
            const transporter = this.createTransporter(smtpConfig);
            await transporter.sendMail({
                from: smtpConfig.from || smtpConfig.user,
                ...options,
            });
            console.log(`Email sent: ${options.subject} to ${options.to}`);
            return true;
        } catch (error: unknown) {
            console.error('Email failed:', error);
            return false;
        }
    }

    async sendOfferAccepted(to: string, data: any, smtpConfig: SmtpConfig): Promise<boolean> {
        const url = `${this.frontendUrl}/dashboard/offers/${data.offerId}`;
        const { subject, html } = emailTemplates.offerAccepted(data, url);
        return this.send({ to, subject, html }, smtpConfig);
    }

    async sendOfferRejected(to: string, data: any, smtpConfig: SmtpConfig): Promise<boolean> {
        const url = `${this.frontendUrl}/dashboard/offers/${data.offerId}`;
        const { subject, html } = emailTemplates.offerRejected(data, url);
        return this.send({ to, subject, html }, smtpConfig);
    }

    async sendNewComment(to: string, data: any, smtpConfig: SmtpConfig): Promise<boolean> {
        const url = `${this.frontendUrl}/dashboard/offers/${data.offerId}`;
        const { subject, html } = emailTemplates.newComment(data, url);
        return this.send({ to, subject, html }, smtpConfig);
    }

    async sendOfferLink(to: string, data: any, smtpConfig: SmtpConfig): Promise<boolean> {
        const { subject, html } = emailTemplates.offerLink(data);
        return this.send({ to, subject, html }, smtpConfig);
    }

    async sendAcceptanceConfirmation(to: string, data: any, smtpConfig: SmtpConfig): Promise<boolean> {
        const { subject, html } = emailTemplates.acceptanceConfirmation(data);
        return this.send({ to, subject, html }, smtpConfig);
    }

    async sendSignatureConfirmation(to: string, data: any, smtpConfig: SmtpConfig): Promise<boolean> {
        const { subject, html } = emailTemplates.signatureConfirmation(data);
        return this.send({ to, subject, html }, smtpConfig);
    }

    async sendFollowUpReminder(to: string, data: any, smtpConfig: SmtpConfig): Promise<boolean> {
        const url = `${this.frontendUrl}/dashboard/followups`;
        const { subject, html } = emailTemplates.followUpReminder(data, url);
        return this.send({ to, subject, html }, smtpConfig);
    }
}