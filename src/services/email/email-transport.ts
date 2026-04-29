// src/services/email/email-transport.ts
import nodemailer from 'nodemailer';
import { createModuleLogger } from '../../lib/logger';
import type { EmailLogStatus } from '../../types';

const logger = createModuleLogger('email-transport');

export interface SmtpConfig {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
}

export interface EmailPayload {
    from: string;
    to: string;
    subject: string;
    html: string;
    text: string;
    attachments: nodemailer.SendMailOptions['attachments'];
}

export function buildHtmlBody(body: string): string {
    return `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
<tr><td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
<tr><td style="background:linear-gradient(135deg,#0891b2,#3b82f6);padding:28px 32px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">SmartQuote AI</h1>
</td></tr>
<tr><td style="padding:32px 32px 24px;">
<div style="color:#334155;font-size:14px;line-height:1.7;">${body.replace(/\n/g, '<br/>')}</div>
</td></tr>
<tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
<p style="margin:0;color:#94a3b8;font-size:12px;">SmartQuote AI — Inteligentne zarządzanie ofertami</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

export function htmlToPlainText(html: string): string {
    return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/h[1-6]>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export function appendLinksToBody(body: string, linkLines: string[]): string {
    if (linkLines.length === 0) return body;
    return `${body}\n\n---\n${linkLines.join('\n')}`;
}

function createTransporter(config: SmtpConfig): nodemailer.Transporter {
    return nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: { user: config.user, pass: config.pass },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 30000,
    });
}

export async function sendEmail(
    payload: EmailPayload,
    smtpConfig: SmtpConfig,
): Promise<{ status: EmailLogStatus; errorMessage?: string }> {
    try {
        const transporter = createTransporter(smtpConfig);
        await transporter.sendMail({
            from: smtpConfig.from,
            to: payload.to,
            subject: payload.subject,
            html: payload.html,
            text: payload.text,
            attachments: payload.attachments,
        });
        logger.info({ to: payload.to, subject: payload.subject }, 'Email sent successfully');
        return { status: 'SENT' };
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Nieznany błąd SMTP';
        logger.error(
            { err, to: payload.to, smtpHost: smtpConfig.host, errorMessage },
            'SMTP sendMail failed',
        );
        return { status: 'FAILED', errorMessage };
    }
}