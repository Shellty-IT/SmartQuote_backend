"use strict";
// smartquote_backend/src/services/email.service.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
class EmailService {
    constructor() {
        this.transporter = null;
        this.isConfigured = false;
        this.frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
        this.initialize();
    }
    initialize() {
        const host = process.env.SMTP_HOST;
        const port = parseInt(process.env.SMTP_PORT || '587', 10);
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        if (!host || !user || !pass) {
            console.warn('⚠️  SMTP not configured — email sending disabled');
            return;
        }
        this.transporter = nodemailer_1.default.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
        });
        this.isConfigured = true;
        console.log('✅ Email service initialized');
    }
    formatCurrency(amount, currency = 'PLN') {
        return new Intl.NumberFormat('pl-PL', {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
        }).format(amount);
    }
    baseTemplate(content) {
        return `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
<tr><td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
<tr><td style="background:linear-gradient(135deg,#0891b2,#3b82f6);padding:28px 32px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">⚡ SmartQuote AI</h1>
</td></tr>
<tr><td style="padding:32px 32px 24px;">${content}</td></tr>
<tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
<p style="margin:0;color:#94a3b8;font-size:12px;">SmartQuote AI — Inteligentne zarządzanie ofertami</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
    }
    ctaButton(url, label) {
        return `<table cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0;">
<tr><td style="background:linear-gradient(135deg,#0891b2,#3b82f6);border-radius:10px;padding:14px 28px;">
<a href="${url}" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;display:inline-block;" target="_blank">${label}</a>
</td></tr></table>`;
    }
    async send(options) {
        if (!this.isConfigured || !this.transporter) {
            console.log(`📧 Email skipped (SMTP not configured): ${options.subject}`);
            return false;
        }
        try {
            await this.transporter.sendMail({
                from: process.env.SMTP_FROM || process.env.SMTP_USER,
                ...options,
            });
            console.log(`📧 Email sent: ${options.subject} → ${options.to}`);
            return true;
        }
        catch (error) {
            console.error('❌ Email failed:', error);
            return false;
        }
    }
    async sendOfferAccepted(to, data) {
        const url = `${this.frontendUrl}/dashboard/offers/${data.offerId}`;
        const html = this.baseTemplate(`
<div style="text-align:center;margin-bottom:24px;">
<div style="width:56px;height:56px;background:#ecfdf5;border-radius:28px;line-height:56px;text-align:center;font-size:28px;display:inline-block;margin-bottom:12px;">✅</div>
<h2 style="margin:0;color:#0f172a;font-size:20px;font-weight:700;">Oferta zaakceptowana!</h2>
</div>
<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 16px;">Klient <strong>${data.clientName}</strong> zaakceptował ofertę:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
<tr><td style="padding:16px;">
<p style="margin:0 0 4px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Oferta</p>
<p style="margin:0;color:#0f172a;font-size:15px;font-weight:600;">${data.offerTitle}</p>
<p style="margin:4px 0 0;color:#64748b;font-size:13px;">${data.offerNumber}</p>
</td></tr>
<tr><td style="padding:0 16px 16px;">
<p style="margin:0 0 4px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Wartość brutto</p>
<p style="margin:0;color:#0891b2;font-size:20px;font-weight:700;">${this.formatCurrency(data.totalGross, data.currency)}</p>
</td></tr>
</table>
${this.ctaButton(url, 'Zobacz ofertę →')}`);
        return this.send({
            to,
            subject: `✅ Oferta ${data.offerNumber} zaakceptowana przez ${data.clientName}`,
            html,
        });
    }
    async sendOfferRejected(to, data) {
        const url = `${this.frontendUrl}/dashboard/offers/${data.offerId}`;
        const reasonBlock = data.reason
            ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-radius:12px;border:1px solid #fecaca;margin-top:16px;">
<tr><td style="padding:16px;">
<p style="margin:0 0 4px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Powód odrzucenia</p>
<p style="margin:0;color:#991b1b;font-size:14px;line-height:1.5;">${data.reason}</p>
</td></tr></table>`
            : '';
        const html = this.baseTemplate(`
<div style="text-align:center;margin-bottom:24px;">
<div style="width:56px;height:56px;background:#fef2f2;border-radius:28px;line-height:56px;text-align:center;font-size:28px;display:inline-block;margin-bottom:12px;">❌</div>
<h2 style="margin:0;color:#0f172a;font-size:20px;font-weight:700;">Oferta odrzucona</h2>
</div>
<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 16px;">Klient <strong>${data.clientName}</strong> odrzucił ofertę:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
<tr><td style="padding:16px;">
<p style="margin:0 0 4px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Oferta</p>
<p style="margin:0;color:#0f172a;font-size:15px;font-weight:600;">${data.offerTitle}</p>
<p style="margin:4px 0 0;color:#64748b;font-size:13px;">${data.offerNumber}</p>
</td></tr>
</table>
${reasonBlock}
${this.ctaButton(url, 'Zobacz szczegóły →')}`);
        return this.send({
            to,
            subject: `❌ Oferta ${data.offerNumber} odrzucona przez ${data.clientName}`,
            html,
        });
    }
    async sendNewComment(to, data) {
        const url = `${this.frontendUrl}/dashboard/offers/${data.offerId}`;
        const html = this.baseTemplate(`
<div style="text-align:center;margin-bottom:24px;">
<div style="width:56px;height:56px;background:#eff6ff;border-radius:28px;line-height:56px;text-align:center;font-size:28px;display:inline-block;margin-bottom:12px;">💬</div>
<h2 style="margin:0;color:#0f172a;font-size:20px;font-weight:700;">Nowy komentarz</h2>
</div>
<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 16px;">Klient <strong>${data.clientName}</strong> dodał komentarz do oferty <strong>${data.offerNumber}</strong>:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border-radius:12px;border:1px solid #bae6fd;">
<tr><td style="padding:16px;">
<p style="margin:0;color:#0c4a6e;font-size:14px;line-height:1.6;font-style:italic;">&ldquo;${data.commentPreview}&rdquo;</p>
</td></tr>
</table>
${this.ctaButton(url, 'Odpowiedz →')}`);
        return this.send({
            to,
            subject: `💬 Nowy komentarz od ${data.clientName} — oferta ${data.offerNumber}`,
            html,
        });
    }
}
exports.emailService = new EmailService();
