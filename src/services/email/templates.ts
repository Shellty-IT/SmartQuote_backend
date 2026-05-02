// src/services/email/templates.ts
export interface OfferEmailData {
    readonly offerNumber: string;
    readonly offerTitle: string;
    readonly clientName: string;
    readonly offerId: string;
}

export interface OfferAcceptedEmailData extends OfferEmailData {
    readonly totalGross: number;
    readonly currency: string;
}

export interface OfferRejectedEmailData extends OfferEmailData {
    readonly reason?: string;
}

export interface CommentEmailData extends OfferEmailData {
    readonly commentPreview: string;
}

export interface OfferLinkEmailData {
    readonly offerNumber: string;
    readonly offerTitle: string;
    readonly clientName: string;
    readonly totalGross: number;
    readonly currency: string;
    readonly validUntil: string | null;
    readonly publicUrl: string;
    readonly sellerName: string;
    readonly companyName: string | null;
}

export interface AcceptanceConfirmationEmailData {
    readonly offerNumber: string;
    readonly offerTitle: string;
    readonly clientName: string;
    readonly totalGross: number;
    readonly currency: string;
    readonly contentHash: string;
    readonly acceptedAt: string;
    readonly selectedVariant?: string | null;
    readonly publicUrl: string;
    readonly sellerName: string;
    readonly companyName: string | null;
}

export interface SignatureConfirmationEmailData {
    readonly contractNumber: string;
    readonly contractTitle: string;
    readonly signerName: string;
    readonly totalGross: number;
    readonly currency: string;
    readonly contentHash: string;
    readonly signedAt: string;
    readonly publicUrl: string;
    readonly sellerName: string;
    readonly companyName: string | null;
}

export interface FollowUpReminderEmailData {
    readonly followUpTitle: string;
    readonly dueDateFormatted: string;
    readonly priority: string;
    readonly type: string;
    readonly clientName: string | null;
    readonly offerNumber: string | null;
    readonly contractNumber: string | null;
}

const baseTemplate = (content: string) => `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
<tr><td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
<tr><td style="background:linear-gradient(135deg,#0891b2,#3b82f6);padding:28px 32px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">SmartQuote AI</h1>
</td></tr>
<tr><td style="padding:32px 32px 24px;">${content}</td></tr>
<tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
<p style="margin:0;color:#94a3b8;font-size:12px;">SmartQuote AI - Inteligentne zarządzanie ofertami</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

const ctaButton = (url: string, label: string) =>
    `<table cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0;">
<tr><td style="background:linear-gradient(135deg,#0891b2,#3b82f6);border-radius:10px;padding:14px 28px;">
<a href="${url}" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;display:inline-block;" target="_blank">${label}</a>
</td></tr></table>`;

const ctaButtonEmerald = (url: string, label: string) =>
    `<table cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0;">
<tr><td style="background:linear-gradient(135deg,#059669,#0d9488);border-radius:10px;padding:14px 28px;">
<a href="${url}" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;display:inline-block;" target="_blank">${label}</a>
</td></tr></table>`;

const ctaButtonAmber = (url: string, label: string) =>
    `<table cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0;">
<tr><td style="background:linear-gradient(135deg,#d97706,#ea580c);border-radius:10px;padding:14px 28px;">
<a href="${url}" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;display:inline-block;" target="_blank">${label}</a>
</td></tr></table>`;

function formatCurrency(amount: number, currency = 'PLN'): string {
    return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
    }).format(amount);
}

function formatDateTime(isoString: string): string {
    return new Date(isoString).toLocaleString('pl-PL', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

function formatDate(isoString: string): string {
    return new Date(isoString).toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}

function sellerSignature(sellerName: string, companyName: string | null): string {
    return `<p style="color:#94a3b8;font-size:12px;margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;">
Pozdrawiam,<br/>
<strong style="color:#475569;">${sellerName}</strong>
${companyName ? `<br/><span style="color:#64748b;">${companyName}</span>` : ''}
</p>`;
}

function infoCard(rows: string): string {
    return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">${rows}</table>`;
}

function infoRow(label: string, value: string): string {
    return `<tr><td style="padding:0 16px 16px;">
<p style="margin:0 0 4px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">${label}</p>
<p style="margin:0;color:#0f172a;font-size:14px;">${value}</p>
</td></tr>`;
}

function infoRowFirst(label: string, title: string, subtitle: string): string {
    return `<tr><td style="padding:16px;">
<p style="margin:0 0 4px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">${label}</p>
<p style="margin:0;color:#0f172a;font-size:15px;font-weight:600;">${title}</p>
<p style="margin:4px 0 0;color:#64748b;font-size:13px;">${subtitle}</p>
</td></tr>`;
}

function priceRow(label: string, value: string, color: string): string {
    return `<tr><td style="padding:0 16px 16px;">
<p style="margin:0 0 4px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">${label}</p>
<p style="margin:0;color:${color};font-size:20px;font-weight:700;">${value}</p>
</td></tr>`;
}

const TYPE_LABELS: Record<string, string> = {
    CALL: 'Telefon',
    EMAIL: 'Email',
    MEETING: 'Spotkanie',
    TASK: 'Zadanie',
    REMINDER: 'Przypomnienie',
    OTHER: 'Inne',
};

const PRIORITY_LABELS: Record<string, string> = {
    URGENT: 'Pilny',
    HIGH: 'Wysoki',
    MEDIUM: 'Średni',
    LOW: 'Niski',
};

const PRIORITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    URGENT: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
    HIGH: { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa' },
    MEDIUM: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
    LOW: { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
};

export const emailTemplates = {
    offerAccepted(data: OfferAcceptedEmailData, url: string) {
        const html = baseTemplate(`
<div style="text-align:center;margin-bottom:24px;">
<div style="width:56px;height:56px;background:#ecfdf5;border-radius:28px;line-height:56px;text-align:center;font-size:28px;display:inline-block;margin-bottom:12px;">Check</div>
<h2 style="margin:0;color:#0f172a;font-size:20px;font-weight:700;">Oferta zaakceptowana!</h2>
</div>
<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 16px;">Klient <strong>${data.clientName}</strong> zaakceptował ofertę:</p>
${infoCard(`
${infoRowFirst('Oferta', data.offerTitle, data.offerNumber)}
${priceRow('Wartość brutto', formatCurrency(data.totalGross, data.currency), '#0891b2')}
`)}
${ctaButton(url, 'Zobacz ofertę →')}`);
        return {
            subject: `Oferta ${data.offerNumber} zaakceptowana przez ${data.clientName}`,
            html,
        };
    },

    offerRejected(data: OfferRejectedEmailData, url: string) {
        const reasonBlock = data.reason
            ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-radius:12px;border:1px solid #fecaca;margin-top:16px;">
<tr><td style="padding:16px;">
<p style="margin:0 0 4px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Powód odrzucenia</p>
<p style="margin:0;color:#991b1b;font-size:14px;line-height:1.5;">${data.reason}</p>
</td></tr></table>`
            : '';

        const html = baseTemplate(`
<div style="text-align:center;margin-bottom:24px;">
<div style="width:56px;height:56px;background:#fef2f2;border-radius:28px;line-height:56px;text-align:center;font-size:28px;display:inline-block;margin-bottom:12px;">Cross</div>
<h2 style="margin:0;color:#0f172a;font-size:20px;font-weight:700;">Oferta odrzucona</h2>
</div>
<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 16px;">Klient <strong>${data.clientName}</strong> odrzucił ofertę:</p>
${infoCard(infoRowFirst('Oferta', data.offerTitle, data.offerNumber))}
${reasonBlock}
${ctaButton(url, 'Zobacz szczegóły →')}`);
        return {
            subject: `Oferta ${data.offerNumber} odrzucona przez ${data.clientName}`,
            html,
        };
    },

    newComment(data: CommentEmailData, url: string) {
        const html = baseTemplate(`
<div style="text-align:center;margin-bottom:24px;">
<div style="width:56px;height:56px;background:#eff6ff;border-radius:28px;line-height:56px;text-align:center;font-size:28px;display:inline-block;margin-bottom:12px;">Speech Bubble</div>
<h2 style="margin:0;color:#0f172a;font-size:20px;font-weight:700;">Nowy komentarz</h2>
</div>
<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 16px;">Klient <strong>${data.clientName}</strong> dodał komentarz do oferty <strong>${data.offerNumber}</strong>:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border-radius:12px;border:1px solid #bae6fd;">
<tr><td style="padding:16px;">
<p style="margin:0;color:#0c4a6e;font-size:14px;line-height:1.6;font-style:italic;">&ldquo;${data.commentPreview}&rdquo;</p>
</td></tr>
</table>
${ctaButton(url, 'Odpowiedz →')}`);
        return {
            subject: `Nowy komentarz od ${data.clientName} - oferta ${data.offerNumber}`,
            html,
        };
    },

    offerLink(data: OfferLinkEmailData) {
        const senderLabel = data.companyName ?? data.sellerName;
        const validUntilBlock = data.validUntil
            ? infoRow('Ważna do', formatDate(data.validUntil))
            : '';

        const html = baseTemplate(`
<h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;font-weight:700;">Dzień dobry${data.clientName ? `, ${data.clientName}` : ''}!</h2>
<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
${senderLabel} przygotował dla Ciebie ofertę handlową. Kliknij poniższy przycisk, aby zapoznać się ze szczegółami.
</p>
${infoCard(`
${infoRowFirst('Oferta', data.offerTitle, data.offerNumber)}
${priceRow('Wartość brutto', formatCurrency(data.totalGross, data.currency), '#0891b2')}
${validUntilBlock}
`)}
${ctaButton(data.publicUrl, 'Zobacz ofertę →')}
<p style="color:#64748b;font-size:13px;line-height:1.6;margin:16px 0 0;">
Na stronie oferty możesz przeglądać pozycje, wybierać opcje, zadawać pytania i zaakceptować lub odrzucić ofertę.
</p>
${sellerSignature(data.sellerName, data.companyName)}`);
        return {
            subject: `Oferta ${data.offerNumber} - ${data.offerTitle} | ${senderLabel}`,
            html,
        };
    },

    acceptanceConfirmation(data: AcceptanceConfirmationEmailData) {
        const variantBlock = data.selectedVariant
            ? infoRow('Wybrany wariant', `<strong>${data.selectedVariant}</strong>`)
            : '';

        const html = baseTemplate(`
<div style="text-align:center;margin-bottom:24px;">
<div style="width:56px;height:56px;background:#ecfdf5;border-radius:28px;line-height:56px;text-align:center;font-size:28px;display:inline-block;margin-bottom:12px;">Lock</div>
<h2 style="margin:0;color:#0f172a;font-size:20px;font-weight:700;">Potwierdzenie akceptacji oferty</h2>
</div>
<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
Dzień dobry${data.clientName ? `, ${data.clientName}` : ''}! Potwierdzamy przyjęcie Twojej akceptacji oferty.
</p>
${infoCard(`
${infoRowFirst('Oferta', data.offerTitle, data.offerNumber)}
${priceRow('Wartość brutto', formatCurrency(data.totalGross, data.currency), '#0891b2')}
${variantBlock}
${infoRow('Data akceptacji', formatDateTime(data.acceptedAt))}
`)}
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;margin-top:16px;">
<tr><td style="padding:16px;">
<p style="margin:0 0 4px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Cyfrowy odcisk treści (SHA-256)</p>
<p style="margin:0;color:#166534;font-size:12px;font-family:monospace;word-break:break-all;line-height:1.6;">${data.contentHash}</p>
</td></tr>
</table>
<p style="color:#64748b;font-size:12px;line-height:1.6;margin:16px 0 0;">
Ten hash jest unikalnym odciskiem cyfrowym treści oferty w momencie akceptacji.
Każda zmiana w treści oferty spowodowałaby wygenerowanie innego hasha - co potwierdza,
że dokument nie został zmodyfikowany po akceptacji.
</p>
${ctaButton(data.publicUrl, 'Zobacz ofertę i pobierz PDF →')}
${sellerSignature(data.sellerName, data.companyName)}`);
        return { subject: `Potwierdzenie akceptacji oferty ${data.offerNumber}`, html };
    },

    signatureConfirmation(data: SignatureConfirmationEmailData) {
        const html = baseTemplate(`
<div style="text-align:center;margin-bottom:24px;">
<div style="width:56px;height:56px;background:#ecfdf5;border-radius:28px;line-height:56px;text-align:center;font-size:28px;display:inline-block;margin-bottom:12px;">Pen</div>
<h2 style="margin:0;color:#0f172a;font-size:20px;font-weight:700;">Potwierdzenie podpisu umowy</h2>
</div>
<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
Dzień dobry${data.signerName ? `, ${data.signerName}` : ''}! Potwierdzamy złożenie podpisu elektronicznego pod umową.
</p>
${infoCard(`
${infoRowFirst('Umowa', data.contractTitle, data.contractNumber)}
${priceRow('Wartość brutto', formatCurrency(data.totalGross, data.currency), '#059669')}
${infoRow('Data podpisu', formatDateTime(data.signedAt))}
`)}
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;margin-top:16px;">
<tr><td style="padding:16px;">
<p style="margin:0 0 4px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Cyfrowy odcisk treści (SHA-256)</p>
<p style="margin:0;color:#166534;font-size:12px;font-family:monospace;word-break:break-all;line-height:1.6;">${data.contentHash}</p>
</td></tr>
</table>
<p style="color:#64748b;font-size:12px;line-height:1.6;margin:16px 0 0;">
Ten hash jest unikalnym odciskiem cyfrowym treści umowy w momencie podpisu.
Każda zmiana w treści umowy spowodowałaby wygenerowanie innego hasha - co potwierdza,
że dokument nie został zmodyfikowany po podpisaniu.
</p>
${ctaButtonEmerald(data.publicUrl, 'Zobacz umowę i pobierz PDF →')}
${sellerSignature(data.sellerName, data.companyName)}`);
        return { subject: `Potwierdzenie podpisu umowy ${data.contractNumber}`, html };
    },

    followUpReminder(data: FollowUpReminderEmailData, url: string) {
        const typeLabel = TYPE_LABELS[data.type] ?? data.type;
        const priorityLabel = PRIORITY_LABELS[data.priority] ?? data.priority;
        const pColor = PRIORITY_COLORS[data.priority] ?? PRIORITY_COLORS.MEDIUM;

        const contextLines: string[] = [];
        if (data.clientName) contextLines.push(`<strong>Klient:</strong> ${data.clientName}`);
        if (data.offerNumber) contextLines.push(`<strong>Oferta:</strong> ${data.offerNumber}`);
        if (data.contractNumber)
            contextLines.push(`<strong>Umowa:</strong> ${data.contractNumber}`);

        const contextBlock =
            contextLines.length > 0
                ? `<tr><td style="padding:0 16px 16px;">
<p style="margin:0 0 4px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Powiązania</p>
${contextLines.map((l) => `<p style="margin:0 0 4px;color:#475569;font-size:13px;line-height:1.5;">${l}</p>`).join('')}
</td></tr>`
                : '';

        const html = baseTemplate(`
<div style="text-align:center;margin-bottom:24px;">
<div style="width:56px;height:56px;background:#fffbeb;border-radius:28px;line-height:56px;text-align:center;font-size:28px;display:inline-block;margin-bottom:12px;">Clock</div>
<h2 style="margin:0;color:#0f172a;font-size:20px;font-weight:700;">Zaległy follow-up</h2>
</div>
<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 16px;">Masz zaległy follow-up, który wymaga Twojej uwagi:</p>
${infoCard(`
<tr><td style="padding:16px;">
<p style="margin:0 0 4px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Tytuł</p>
<p style="margin:0;color:#0f172a;font-size:15px;font-weight:600;">${data.followUpTitle}</p>
</td></tr>
<tr><td style="padding:0 16px 16px;">
<table cellpadding="0" cellspacing="0" role="presentation"><tr>
<td style="padding-right:8px;">
<span style="display:inline-block;background:${pColor.bg};color:${pColor.text};border:1px solid ${pColor.border};border-radius:6px;padding:4px 10px;font-size:12px;font-weight:600;">${priorityLabel}</span>
</td>
<td>
<span style="display:inline-block;background:#f0f9ff;color:#0c4a6e;border:1px solid #bae6fd;border-radius:6px;padding:4px 10px;font-size:12px;">${typeLabel}</span>
</td>
</tr></table>
</td></tr>
<tr><td style="padding:0 16px 16px;">
<p style="margin:0 0 4px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Termin</p>
<p style="margin:0;color:#dc2626;font-size:14px;font-weight:600;">Warning ${data.dueDateFormatted} (zaległy)</p>
</td></tr>
${contextBlock}
`)}
${ctaButtonAmber(url, 'Sprawdź follow-upy →')}`);
        return { subject: `Zaległy follow-up: ${data.followUpTitle}`, html };
    },
};