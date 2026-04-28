// src/services/email/template-builder.ts
export class EmailTemplateBuilder {
    private static baseStyles = {
        accent: 'linear-gradient(135deg,#0891b2,#3b82f6)',
        accentEmerald: 'linear-gradient(135deg,#059669,#0d9488)',
        accentAmber: 'linear-gradient(135deg,#d97706,#ea580c)',
        background: '#f1f5f9',
        card: '#ffffff',
        borderRadius: '16px',
        textPrimary: '#0f172a',
        textSecondary: '#475569',
        textMuted: '#94a3b8',
        textLight: '#64748b',
        border: '#e2e8f0',
    };

    static wrap(content: string): string {
        return `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:${this.baseStyles.background};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
<tr><td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:${this.baseStyles.card};border-radius:${this.baseStyles.borderRadius};overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
<tr><td style="background:${this.baseStyles.accent};padding:28px 32px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">SmartQuote AI</h1>
</td></tr>
<tr><td style="padding:32px 32px 24px;">${content}</td></tr>
<tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid ${this.baseStyles.border};text-align:center;">
<p style="margin:0;color:${this.baseStyles.textMuted};font-size:12px;">SmartQuote AI — Inteligentne zarządzanie ofertami</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
    }

    static button(url: string, label: string, gradient = this.baseStyles.accent): string {
        return `<table cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0;">
<tr><td style="background:${gradient};border-radius:10px;padding:14px 28px;">
<a href="${url}" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;display:inline-block;" target="_blank">${label}</a>
</td></tr></table>`;
    }

    static buttonEmerald(url: string, label: string): string {
        return this.button(url, label, this.baseStyles.accentEmerald);
    }

    static buttonAmber(url: string, label: string): string {
        return this.button(url, label, this.baseStyles.accentAmber);
    }

    static infoCard(rows: string): string {
        return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid ${this.baseStyles.border};">${rows}</table>`;
    }

    static infoRowFirst(label: string, title: string, subtitle: string): string {
        return `<tr><td style="padding:16px;">
<p style="margin:0 0 4px;color:${this.baseStyles.textMuted};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">${label}</p>
<p style="margin:0;color:${this.baseStyles.textPrimary};font-size:15px;font-weight:600;">${title}</p>
<p style="margin:4px 0 0;color:${this.baseStyles.textLight};font-size:13px;">${subtitle}</p>
</td></tr>`;
    }

    static infoRow(label: string, value: string): string {
        return `<tr><td style="padding:0 16px 16px;">
<p style="margin:0 0 4px;color:${this.baseStyles.textMuted};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">${label}</p>
<p style="margin:0;color:${this.baseStyles.textPrimary};font-size:14px;">${value}</p>
</td></tr>`;
    }

    static priceRow(label: string, value: string, color: string): string {
        return `<tr><td style="padding:0 16px 16px;">
<p style="margin:0 0 4px;color:${this.baseStyles.textMuted};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">${label}</p>
<p style="margin:0;color:${color};font-size:20px;font-weight:700;">${value}</p>
</td></tr>`;
    }

    static hashBox(hash: string, description: string): string {
        return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;margin-top:16px;">
<tr><td style="padding:16px;">
<p style="margin:0 0 4px;color:${this.baseStyles.textMuted};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Cyfrowy odcisk treści (SHA-256)</p>
<p style="margin:0;color:#166534;font-size:12px;font-family:monospace;word-break:break-all;line-height:1.6;">${hash}</p>
</td></tr>
</table>
<p style="color:${this.baseStyles.textLight};font-size:12px;line-height:1.6;margin:16px 0 0;">${description}</p>`;
    }

    static sellerSignature(sellerName: string, companyName: string | null): string {
        return `<p style="color:${this.baseStyles.textMuted};font-size:12px;margin-top:24px;padding-top:16px;border-top:1px solid ${this.baseStyles.border};">
Pozdrawiam,<br/>
<strong style="color:${this.baseStyles.textSecondary};">${sellerName}</strong>
${companyName ? `<br/><span style="color:${this.baseStyles.textLight};">${companyName}</span>` : ''}
</p>`;
    }

    static reasonBox(reason: string): string {
        return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-radius:12px;border:1px solid #fecaca;margin-top:16px;">
<tr><td style="padding:16px;">
<p style="margin:0 0 4px;color:${this.baseStyles.textMuted};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Powód odrzucenia</p>
<p style="margin:0;color:#991b1b;font-size:14px;line-height:1.5;">${reason}</p>
</td></tr></table>`;
    }

    static commentBox(content: string): string {
        return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border-radius:12px;border:1px solid #bae6fd;">
<tr><td style="padding:16px;">
<p style="margin:0;color:#0c4a6e;font-size:14px;line-height:1.6;font-style:italic;">&ldquo;${content}&rdquo;</p>
</td></tr>
</table>`;
    }

    static iconHeader(emoji: string, bgColor: string, title: string): string {
        return `<div style="text-align:center;margin-bottom:24px;">
<div style="width:56px;height:56px;background:${bgColor};border-radius:28px;line-height:56px;text-align:center;font-size:28px;display:inline-block;margin-bottom:12px;">${emoji}</div>
<h2 style="margin:0;color:#0f172a;font-size:20px;font-weight:700;">${title}</h2>
</div>`;
    }

    static formatCurrency(amount: number, currency = 'PLN'): string {
        return new Intl.NumberFormat('pl-PL', {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
        }).format(amount);
    }

    static formatDateTime(isoString: string): string {
        return new Date(isoString).toLocaleString('pl-PL', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    }

    static formatDate(isoString: string): string {
        return new Date(isoString).toLocaleDateString('pl-PL', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    }
}