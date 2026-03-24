"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailTemplates = void 0;
const baseTemplate = (content) => `<!DOCTYPE html>
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
<p style="margin:0;color:#94a3b8;font-size:12px;">SmartQuote AI — Inteligentne zarządzanie ofertami</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
const ctaButton = (url, label) => `<table cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0;">
<tr><td style="background:linear-gradient(135deg,#0891b2,#3b82f6);border-radius:10px;padding:14px 28px;">
<a href="${url}" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;display:inline-block;" target="_blank">${label}</a>
</td></tr></table>`;
const ctaButtonEmerald = (url, label) => `<table cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0;">
<tr><td style="background:linear-gradient(135deg,#059669,#0d9488);border-radius:10px;padding:14px 28px;">
<a href="${url}" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;display:inline-block;" target="_blank">${label}</a>
</td></tr></table>`;
const ctaButtonAmber = (url, label) => `<table cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0;">
<tr><td style="background:linear-gradient(135deg,#d97706,#ea580c);border-radius:10px;padding:14px 28px;">
<a href="${url}" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;display:inline-block;" target="_blank">${label}</a>
</td></tr></table>`;
const formatCurrency = (amount, currency = 'PLN') => new Intl.NumberFormat('pl-PL', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
const formatDateTime = (isoString) => new Date(isoString).toLocaleString('pl-PL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
});
exports.emailTemplates = {
    offerAccepted: (data, url) => {
        const html = baseTemplate(`
<div style="text-align:center;margin-bottom:24px;">
<div style="width:56px;height:56px;background:#ecfdf5;border-radius:28px;line-height:56px;text-align:center;font-size:28px;display:inline-block;margin-bottom:12px;">Check</div>
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
<p style="margin:0;color:#0891b2;font-size:20px;font-weight:700;">${formatCurrency(data.totalGross, data.currency)}</p>
</td></tr>
</table>
${ctaButton(url, 'Zobacz ofertę →')}`);
        return { subject: `Oferta ${data.offerNumber} zaakceptowana przez ${data.clientName}`, html };
    },
    offerRejected: (data, url) => {
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
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
<tr><td style="padding:16px;">
<p style="margin:0 0 4px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Oferta</p>
<p style="margin:0;color:#0f172a;font-size:15px;font-weight:600;">${data.offerTitle}</p>
<p style="margin:4px 0 0;color:#64748b;font-size:13px;">${data.offerNumber}</p>
</td></tr>
</table>
${reasonBlock}
${ctaButton(url, 'Zobacz szczegóły →')}`);
        return { subject: `Oferta ${data.offerNumber} odrzucona przez ${data.clientName}`, html };
    },
    newComment: (data, url) => {
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
        return { subject: `Nowy komentarz od ${data.clientName} — oferta ${data.offerNumber}`, html };
    },
    offerLink: (data) => {
        const senderLabel = data.companyName || data.sellerName;
        const validUntilBlock = data.validUntil
            ? `<tr><td style="padding:0 16px 16px;">
<p style="margin:0 0 4px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Ważna do</p>
<p style="margin:0;color:#0f172a;font-size:14px;">${new Date(data.validUntil).toLocaleDateString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
</td></tr>`
            : '';
        const html = baseTemplate(`
<h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;font-weight:700;">Dzień dobry${data.clientName ? `, ${data.clientName}` : ''}!</h2>
<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
${senderLabel} przygotował dla Ciebie ofertę handlową. Kliknij poniższy przycisk, aby zapoznać się ze szczegółami.
</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
<tr><td style="padding:16px;">
<p style="margin:0 0 4px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Oferta</p>
<p style="margin:0;color:#0f172a;font-size:15px;font-weight:600;">${data.offerTitle}</p>
<p style="margin:4px 0 0;color:#64748b;font-size:13px;">${data.offerNumber}</p>
</td></tr>
<tr><td style="padding:0 16px 16px;">
<p style="margin:0 0 4px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Wartość brutto</p>
<p style="margin:0;color:#0891b2;font-size:20px;font-weight:700;">${formatCurrency(data.totalGross, data.currency)}</p>
</td></tr>
${validUntilBlock}
</table>
${ctaButton(data.publicUrl, 'Zobacz ofertę →')}
<p style="color:#64748b;font-size:13px;line-height:1.6;margin:16px 0 0;">
Na stronie oferty możesz przeglądać pozycje, wybierać opcje, zadawać pytania i zaakceptować lub odrzucić ofertę.
</p>
<p style="color:#94a3b8;font-size:12px;margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;">
Pozdrawiam,<br/>
<strong style="color:#475569;">${data.sellerName}</strong>
${data.companyName ? `<br/><span style="color:#64748b;">${data.companyName}</span>` : ''}
</p>`);
        return { subject: `Oferta ${data.offerNumber} — ${data.offerTitle} | ${senderLabel}`, html };
    },
    acceptanceConfirmation: (data) => {
        const variantBlock = data.selectedVariant
            ? `<tr><td style="padding:0 16px 16px;">
<p style="margin:0 0 4px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Wybrany wariant</p>
<p style="margin:0;color:#0f172a;font-size:14px;font-weight:600;">${data.selectedVariant}</p>
</td></tr>`
            : '';
        const html = baseTemplate(`
<div style="text-align:center;margin-bottom:24px;">
<div style="width:56px;height:56px;background:#ecfdf5;border-radius:28px;line-height:56px;text-align:center;font-size:28px;display:inline-block;margin-bottom:12px;">Lock</div>
<h2 style="margin:0;color:#0f172a;font-size:20px;font-weight:700;">Potwierdzenie akceptacji oferty</h2>
</div>
<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
Dzień dobry${data.clientName ? `, ${data.clientName}` : ''}! Potwierdzamy przyjęcie Twojej akceptacji oferty.
</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
<tr><td style="padding:16px;">
<p style="margin:0 0 4px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Oferta</p>
<p style="margin:0;color:#0f172a;font-size:15px;font-weight:600;">${data.offerTitle}</p>
<p style="margin:4px 0 0;color:#64748b;font-size:13px;">${data.offerNumber}</p>
</td></tr>
<tr><td style="padding:0 16px 16px;">
<p style="margin:0 0 4px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Wartość brutto</p>
<p style="margin:0;color:#0891b2;font-size:20px;font-weight:700;">${formatCurrency(data.totalGross, data.currency)}</p>
</td></tr>
${variantBlock}
<tr><td style="padding:0 16px 16px;">
<p style="margin:0 0 4px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Data akceptacji</p>
<p style="margin:0;color:#0f172a;font-size:14px;">${formatDateTime(data.acceptedAt)}</p>
</td></tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;margin-top:16px;">
<tr><td style="padding:16px;">
<p style="margin:0 0 4px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Cyfrowy odcisk treści (SHA-256)</p>
<p style="margin:0;color:#166534;font-size:12px;font-family:monospace;word-break:break-all;line-height:1.6;">${data.contentHash}</p>
</td></tr>
</table>
<p style="color:#64748b;font-size:12px;line-height:1.6;margin:16px 0 0;">
Ten hash jest unikalnym odciskiem cyfrowym treści oferty w momencie akceptacji.
Każda zmiana w treści oferty spowodowałaby wygenerowanie innego hasha — co potwierdza,
że dokument nie został zmodyfikowany po akceptacji.
</p>
${ctaButton(data.publicUrl, 'Zobacz ofertę i pobierz PDF →')}
<p style="color:#94a3b8;font-size:12px;margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;">
Pozdrawiam,<br/>
<strong style="color:#475569;">${data.sellerName}</strong>
${data.companyName ? `<br/><span style="color:#64748b;">${data.companyName}</span>` : ''}
</p>`);
        return { subject: `Potwierdzenie akceptacji oferty ${data.offerNumber}`, html };
    },
    signatureConfirmation: (data) => {
        const html = baseTemplate(`
<div style="text-align:center;margin-bottom:24px;">
<div style="width:56px;height:56px;background:#ecfdf5;border-radius:28px;line-height:56px;text-align:center;font-size:28px;display:inline-block;margin-bottom:12px;">Pen</div>
<h2 style="margin:0;color:#0f172a;font-size:20px;font-weight:700;">Potwierdzenie podpisu umowy</h2>
</div>
<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
Dzień dobry${data.signerName ? `, ${data.signerName}` : ''}! Potwierdzamy złożenie podpisu elektronicznego pod umową.
</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
<tr><td style="padding:16px;">
<p style="margin:0 0 4px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Umowa</p>
<p style="margin:0;color:#0f172a;font-size:15px;font-weight:600;">${data.contractTitle}</p>
<p style="margin:4px 0 0;color:#64748b;font-size:13px;">${data.contractNumber}</p>
</td></tr>
<tr><td style="padding:0 16px 16px;">
<p style="margin:0 0 4px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Wartość brutto</p>
<p style="margin:0;color:#059669;font-size:20px;font-weight:700;">${formatCurrency(data.totalGross, data.currency)}</p>
</td></tr>
<tr><td style="padding:0 16px 16px;">
<p style="margin:0 0 4px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Data podpisu</p>
<p style="margin:0;color:#0f172a;font-size:14px;">${formatDateTime(data.signedAt)}</p>
</td></tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;margin-top:16px;">
<tr><td style="padding:16px;">
<p style="margin:0 0 4px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Cyfrowy odcisk treści (SHA-256)</p>
<p style="margin:0;color:#166534;font-size:12px;font-family:monospace;word-break:break-all;line-height:1.6;">${data.contentHash}</p>
</td></tr>
</table>
<p style="color:#64748b;font-size:12px;line-height:1.6;margin:16px 0 0;">
Ten hash jest unikalnym odciskiem cyfrowym treści umowy w momencie podpisu.
Każda zmiana w treści umowy spowodowałaby wygenerowanie innego hasha — co potwierdza,
że dokument nie został zmodyfikowany po podpisaniu.
</p>
${ctaButtonEmerald(data.publicUrl, 'Zobacz umowę i pobierz PDF →')}
<p style="color:#94a3b8;font-size:12px;margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;">
Pozdrawiam,<br/>
<strong style="color:#475569;">${data.sellerName}</strong>
${data.companyName ? `<br/><span style="color:#64748b;">${data.companyName}</span>` : ''}
</p>`);
        return { subject: `Potwierdzenie podpisu umowy ${data.contractNumber}`, html };
    },
    followUpReminder: (data, url) => {
        const typeLabels = {
            CALL: 'Telefon',
            EMAIL: 'Email',
            MEETING: 'Spotkanie',
            TASK: 'Zadanie',
            REMINDER: 'Przypomnienie',
            OTHER: 'Inne',
        };
        const priorityLabels = {
            URGENT: 'Pilny',
            HIGH: 'Wysoki',
            MEDIUM: 'Średni',
            LOW: 'Niski',
        };
        const priorityColors = {
            URGENT: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
            HIGH: { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa' },
            MEDIUM: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
            LOW: { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
        };
        const typeLabel = typeLabels[data.type] || data.type;
        const priorityLabel = priorityLabels[data.priority] || data.priority;
        const pColor = priorityColors[data.priority] || priorityColors.MEDIUM;
        const contextLines = [];
        if (data.clientName)
            contextLines.push(`<strong>Klient:</strong> ${data.clientName}`);
        if (data.offerNumber)
            contextLines.push(`<strong>Oferta:</strong> ${data.offerNumber}`);
        if (data.contractNumber)
            contextLines.push(`<strong>Umowa:</strong> ${data.contractNumber}`);
        const contextBlock = contextLines.length > 0
            ? `<tr><td style="padding:0 16px 16px;">
<p style="margin:0 0 4px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Powiązania</p>
${contextLines.map(l => `<p style="margin:0 0 4px;color:#475569;font-size:13px;line-height:1.5;">${l}</p>`).join('')}
</td></tr>`
            : '';
        const html = baseTemplate(`
<div style="text-align:center;margin-bottom:24px;">
<div style="width:56px;height:56px;background:#fffbeb;border-radius:28px;line-height:56px;text-align:center;font-size:28px;display:inline-block;margin-bottom:12px;">Clock</div>
<h2 style="margin:0;color:#0f172a;font-size:20px;font-weight:700;">Zaległy follow-up</h2>
</div>
<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 16px;">Masz zaległy follow-up, który wymaga Twojej uwagi:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
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
</table>
${ctaButtonAmber(url, 'Sprawdź follow-upy →')}`);
        return { subject: `Zaległy follow-up: ${data.followUpTitle}`, html };
    },
};
