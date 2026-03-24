"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailSender = void 0;
// smartquote_backend/src/services/email/sender.ts
const nodemailer_1 = __importDefault(require("nodemailer"));
const templates_1 = require("./templates");
class EmailSender {
    constructor() {
        this.frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    }
    createTransporter(config) {
        return nodemailer_1.default.createTransport({
            host: config.host,
            port: config.port,
            secure: config.port === 465,
            auth: { user: config.user, pass: config.pass },
        });
    }
    async testConnection(config) {
        try {
            const transporter = this.createTransporter(config);
            await transporter.verify();
            return { success: true };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Nieznany błąd połączenia';
            return { success: false, error: message };
        }
    }
    async send(options, smtpConfig) {
        try {
            const transporter = this.createTransporter(smtpConfig);
            await transporter.sendMail({
                from: smtpConfig.from || smtpConfig.user,
                ...options,
            });
            console.log(`Email sent: ${options.subject} to ${options.to}`);
            return true;
        }
        catch (error) {
            console.error('Email failed:', error);
            return false;
        }
    }
    async sendOfferAccepted(to, data, smtpConfig) {
        const url = `${this.frontendUrl}/dashboard/offers/${data.offerId}`;
        const { subject, html } = templates_1.emailTemplates.offerAccepted(data, url);
        return this.send({ to, subject, html }, smtpConfig);
    }
    async sendOfferRejected(to, data, smtpConfig) {
        const url = `${this.frontendUrl}/dashboard/offers/${data.offerId}`;
        const { subject, html } = templates_1.emailTemplates.offerRejected(data, url);
        return this.send({ to, subject, html }, smtpConfig);
    }
    async sendNewComment(to, data, smtpConfig) {
        const url = `${this.frontendUrl}/dashboard/offers/${data.offerId}`;
        const { subject, html } = templates_1.emailTemplates.newComment(data, url);
        return this.send({ to, subject, html }, smtpConfig);
    }
    async sendOfferLink(to, data, smtpConfig) {
        const { subject, html } = templates_1.emailTemplates.offerLink(data);
        return this.send({ to, subject, html }, smtpConfig);
    }
    async sendAcceptanceConfirmation(to, data, smtpConfig) {
        const { subject, html } = templates_1.emailTemplates.acceptanceConfirmation(data);
        return this.send({ to, subject, html }, smtpConfig);
    }
    async sendSignatureConfirmation(to, data, smtpConfig) {
        const { subject, html } = templates_1.emailTemplates.signatureConfirmation(data);
        return this.send({ to, subject, html }, smtpConfig);
    }
    async sendFollowUpReminder(to, data, smtpConfig) {
        const url = `${this.frontendUrl}/dashboard/followups`;
        const { subject, html } = templates_1.emailTemplates.followUpReminder(data, url);
        return this.send({ to, subject, html }, smtpConfig);
    }
}
exports.EmailSender = EmailSender;
