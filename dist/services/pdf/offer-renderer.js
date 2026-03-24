"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderOfferPDF = renderOfferPDF;
// smartquote_backend/src/services/pdf/offer-renderer.ts
const pdfkit_1 = __importDefault(require("pdfkit"));
const helpers_1 = require("./helpers");
function renderOfferPDF(offer) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        const doc = new pdfkit_1.default({
            size: 'A4',
            margins: { top: 40, bottom: 80, left: 40, right: 40 },
            layout: 'portrait'
        });
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        const W = 515;
        const L = 40;
        let Y = 40;
        const ACCENT = '#0891b2';
        // Header
        doc.rect(0, 0, 595, 45).fill(ACCENT);
        doc.font('Helvetica-Bold').fontSize(18).fillColor('#fff').text('SmartQuote', L, 14);
        const company = (0, helpers_1.txt)(offer.user.company || offer.user.name || '');
        doc.font('Helvetica').fontSize(8).text(company, 350, 10, { width: 200, align: 'right' });
        if (offer.user.email)
            doc.text(offer.user.email, 350, 20, { width: 200, align: 'right' });
        if (offer.user.phone)
            doc.text(offer.user.phone, 350, 30, { width: 200, align: 'right' });
        Y = 55;
        doc.font('Helvetica-Bold').fontSize(16).fillColor('#1e293b').text('OFERTA HANDLOWA', L, Y);
        doc.font('Helvetica').fontSize(10).fillColor(ACCENT).text('Nr: ' + offer.number, L + 170, Y + 2);
        Y += 28;
        const boxW = 248;
        const boxH = 70;
        doc.rect(L, Y, boxW, boxH).fill('#f1f5f9');
        doc.rect(L, Y, boxW, 16).fill(ACCENT);
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#fff').text('SPRZEDAWCA', L + 8, Y + 4);
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b').text(company, L + 8, Y + 22);
        doc.font('Helvetica').fontSize(8);
        let sY = Y + 34;
        if (offer.user.email) {
            doc.text(offer.user.email, L + 8, sY);
            sY += 10;
        }
        if (offer.user.phone) {
            doc.text(offer.user.phone, L + 8, sY);
        }
        const bX = L + boxW + 19;
        doc.rect(bX, Y, boxW, boxH).fill('#f1f5f9');
        doc.rect(bX, Y, boxW, 16).fill(ACCENT);
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#fff').text('NABYWCA', bX + 8, Y + 4);
        const client = (0, helpers_1.txt)(offer.client.type === 'COMPANY' ? (offer.client.company || offer.client.name) : offer.client.name);
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b').text(client, bX + 8, Y + 22);
        doc.font('Helvetica').fontSize(8);
        let cY = Y + 34;
        if (offer.client.nip) {
            doc.text('NIP: ' + offer.client.nip, bX + 8, cY);
            cY += 10;
        }
        if (offer.client.email) {
            doc.text(offer.client.email, bX + 8, cY);
            cY += 10;
        }
        Y += boxH + 10;
        doc.rect(L, Y, W, 26).fill('#f1f5f9');
        const infos = [
            ['Data', (0, helpers_1.date)(offer.createdAt)],
            ['Ważna do', (0, helpers_1.date)(offer.validUntil)],
            ['Status', helpers_1.statusMap[offer.status] || offer.status],
            ['Płatność', offer.paymentDays + ' dni']
        ];
        const iW = W / 4;
        infos.forEach(([lbl, val], i) => {
            const x = L + i * iW + 6;
            doc.font('Helvetica').fontSize(7).fillColor('#64748b').text(lbl, x, Y + 4);
            doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b').text(val, x, Y + 13);
        });
        Y += 32;
        if (offer.title) {
            doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e293b').text((0, helpers_1.txt)(offer.title), L, Y);
            Y += 15;
        }
        if (offer.description) {
            doc.font('Helvetica').fontSize(8).fillColor('#64748b').text((0, helpers_1.txt)(offer.description), L, Y, { width: W });
            Y += 15;
        }
        const variantGroups = (0, helpers_1.groupItemsByVariant)(offer.items);
        const hasVariants = variantGroups.some(g => g.name !== null);
        for (const group of variantGroups) {
            if (Y > 650) {
                doc.addPage();
                Y = 40;
            }
            if (hasVariants) {
                const label = group.name ? 'Wariant: ' + (0, helpers_1.txt)(group.name) : 'Pozycje wspólne';
                doc.rect(L, Y, W, 20).fill(group.name ? '#ecfeff' : '#f1f5f9');
                doc.font('Helvetica-Bold').fontSize(9)
                    .fillColor(group.name ? '#0891b2' : '#475569')
                    .text(label, L + 8, Y + 5);
                Y += 24;
            }
            Y = (0, helpers_1.renderItemsTable)(doc, group.items, Y, ACCENT, W, L);
            if (hasVariants) {
                const subX = L + W - 160;
                Y += 4;
                doc.font('Helvetica').fontSize(8).fillColor('#64748b').text('Netto sekcji:', subX, Y);
                doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e293b')
                    .text((0, helpers_1.money)(group.totalNet, offer.currency), subX + 70, Y, { width: 90, align: 'right' });
                Y += 12;
                doc.font('Helvetica').fontSize(8).fillColor('#64748b').text('Brutto sekcji:', subX, Y);
                doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e293b')
                    .text((0, helpers_1.money)(group.totalGross, offer.currency), subX + 70, Y, { width: 90, align: 'right' });
                Y += 16;
            }
            Y += 8;
        }
        Y += 4;
        const sumX = L + W - 180;
        doc.font('Helvetica').fontSize(9).fillColor('#1e293b').text('Netto:', sumX, Y);
        doc.font('Helvetica-Bold').text((0, helpers_1.money)(offer.totalNet, offer.currency), sumX + 60, Y, { width: 120, align: 'right' });
        Y += 14;
        doc.font('Helvetica').text('VAT:', sumX, Y);
        doc.font('Helvetica-Bold').text((0, helpers_1.money)(offer.totalVat, offer.currency), sumX + 60, Y, { width: 120, align: 'right' });
        Y += 18;
        doc.rect(sumX, Y, 180, 22).fill(ACCENT);
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#fff').text('BRUTTO:', sumX + 8, Y + 6);
        doc.text((0, helpers_1.money)(offer.totalGross, offer.currency), sumX + 60, Y + 6, { width: 112, align: 'right' });
        Y += 35;
        if (hasVariants) {
            doc.font('Helvetica').fontSize(7).fillColor('#94a3b8')
                .text('* Kwota brutto dotyczy pozycji wspólnych + pierwszego wariantu', L, Y);
            Y += 15;
        }
        if (offer.terms) {
            if (Y > 680) {
                doc.addPage();
                Y = 40;
            }
            doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b').text('Warunki:', L, Y);
            Y += 12;
            doc.font('Helvetica').fontSize(8).fillColor('#64748b').text((0, helpers_1.txt)(offer.terms), L, Y, { width: W });
            Y += 25;
        }
        doc.moveTo(380, Y + 20).lineTo(555, Y + 20).stroke('#cbd5e1');
        doc.font('Helvetica').fontSize(7).fillColor('#94a3b8').text('Podpis i pieczęć', 380, Y + 24, { width: 175, align: 'center' });
        const targetY = 720;
        if (Y < targetY)
            Y = targetY;
        doc.moveTo(L, Y + 20).lineTo(L + W, Y + 20).stroke('#e2e8f0');
        doc.font('Helvetica').fontSize(7).fillColor('#94a3b8')
            .text('Wygenerowano w SmartQuote AI | ' + (0, helpers_1.date)(new Date()), L, Y + 25, { width: W, align: 'center' });
        if (offer.acceptanceLog) {
            renderAuditTrailPage(doc, offer, offer.acceptanceLog);
        }
        doc.end();
    });
}
function renderAuditTrailPage(doc, offer, log) {
    doc.addPage();
    const W = 515;
    const L = 40;
    let Y = 40;
    const ACCENT = '#059669';
    const ACCENT_LIGHT = '#ecfdf5';
    doc.rect(0, 0, 595, 50).fill(ACCENT);
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#fff')
        .text('CERTIFICATE OF ACCEPTANCE', L, 10);
    doc.font('Helvetica').fontSize(9).fillColor('#d1fae5')
        .text('Formalne potwierdzenie akceptacji oferty', L, 30);
    doc.font('Helvetica').fontSize(8).fillColor('#fff')
        .text('SmartQuote AI', 400, 10, { width: 155, align: 'right' });
    doc.text((0, helpers_1.dateTime)(log.acceptedAt), 400, 22, { width: 155, align: 'right' });
    Y = 65;
    doc.rect(L, Y, W, 55).fill(ACCENT_LIGHT).stroke('#a7f3d0');
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#065f46')
        .text('Oferta zaakceptowana', L + 15, Y + 8);
    doc.font('Helvetica').fontSize(9).fillColor('#047857')
        .text((0, helpers_1.txt)(offer.title), L + 15, Y + 22);
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#065f46')
        .text('Nr: ' + offer.number, L + 15, Y + 36);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#065f46')
        .text((0, helpers_1.money)(log.totalGross, log.currency), 350, Y + 18, { width: W - 350 + L - 15, align: 'right' });
    Y += 70;
    const colW = (W - 15) / 2;
    doc.rect(L, Y, colW, 16).fill(ACCENT);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#fff').text('AKCEPTUJĄCY', L + 8, Y + 4);
    doc.rect(L, Y + 16, colW, 50).fill('#f8fafc').stroke('#e2e8f0');
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b')
        .text((0, helpers_1.txt)(log.clientName || '-'), L + 8, Y + 22);
    doc.font('Helvetica').fontSize(8).fillColor('#64748b')
        .text(log.clientEmail || '-', L + 8, Y + 34);
    const rX = L + colW + 15;
    doc.rect(rX, Y, colW, 16).fill(ACCENT);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#fff').text('SPRZEDAWCA', rX + 8, Y + 4);
    doc.rect(rX, Y + 16, colW, 50).fill('#f8fafc').stroke('#e2e8f0');
    const seller = (0, helpers_1.txt)(offer.user.company || offer.user.name || '');
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b')
        .text(seller, rX + 8, Y + 22);
    doc.font('Helvetica').fontSize(8).fillColor('#64748b')
        .text(offer.user.email, rX + 8, Y + 34);
    Y += 80;
    doc.rect(L, Y, W, 16).fill('#0f172a');
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#fff')
        .text('SZCZEGÓŁY AKCEPTACJI', L + 8, Y + 4);
    Y += 16;
    const details = [
        ['Data i czas akceptacji', (0, helpers_1.dateTime)(log.acceptedAt)],
        ['Kwota netto', (0, helpers_1.money)(log.totalNet, log.currency)],
        ['Kwota VAT', (0, helpers_1.money)(log.totalVat, log.currency)],
        ['Kwota brutto', (0, helpers_1.money)(log.totalGross, log.currency)],
    ];
    if (log.selectedVariant) {
        details.push(['Wybrany wariant', (0, helpers_1.txt)(log.selectedVariant)]);
    }
    details.push(['Adres IP', log.ipAddress], ['Klient (nabywca)', (0, helpers_1.txt)(offer.client.type === 'COMPANY' ? (offer.client.company || offer.client.name) : offer.client.name)]);
    if (offer.client.nip) {
        details.push(['NIP nabywcy', offer.client.nip]);
    }
    details.forEach(([label, value], idx) => {
        const bg = idx % 2 === 0 ? '#fff' : '#f8fafc';
        doc.rect(L, Y, W, 18).fill(bg).stroke('#e2e8f0');
        doc.font('Helvetica').fontSize(8).fillColor('#64748b')
            .text(label, L + 8, Y + 5);
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e293b')
            .text(value, L + 200, Y + 5, { width: W - 208, align: 'right' });
        Y += 18;
    });
    Y += 10;
    doc.rect(L, Y, W, 16).fill('#0f172a');
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#fff')
        .text('USER AGENT', L + 8, Y + 4);
    Y += 16;
    doc.rect(L, Y, W, 28).fill('#f8fafc').stroke('#e2e8f0');
    const uaTruncated = log.userAgent.length > 120
        ? log.userAgent.slice(0, 120) + '...'
        : log.userAgent;
    doc.font('Courier').fontSize(6).fillColor('#64748b')
        .text(uaTruncated, L + 8, Y + 4, { width: W - 16 });
    Y += 32;
    Y += 10;
    doc.rect(L, Y, W, 16).fill('#0f172a');
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#fff')
        .text('CONTENT HASH (SHA-256)', L + 8, Y + 4);
    Y += 16;
    doc.rect(L, Y, W, 24).fill('#0f172a').stroke('#1e293b');
    doc.font('Courier').fontSize(7).fillColor('#34d399')
        .text(log.contentHash, L + 8, Y + 8, { width: W - 16 });
    Y += 28;
    doc.font('Helvetica').fontSize(7).fillColor('#64748b')
        .text('Hash SHA-256 wygenerowany z zawartości oferty (pozycje, ceny, wariant, waluta). ' +
        'Służy do weryfikacji integralności danych w momencie akceptacji.', L, Y + 4, { width: W });
    Y += 28;
    doc.rect(L, Y, W, 45).fill(ACCENT_LIGHT).stroke('#a7f3d0');
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#065f46')
        .text('Oświadczenie', L + 10, Y + 6);
    doc.font('Helvetica').fontSize(7).fillColor('#047857')
        .text('Niniejszy certyfikat potwierdza, że osoba wskazana powyżej zaakceptowała ofertę ' +
        'nr ' + offer.number + ' w dniu ' + (0, helpers_1.dateTime)(log.acceptedAt) + '. ' +
        'Dane zostały zarejestrowane automatycznie przez system SmartQuote AI i są niemodyfikowalne. ' +
        'Hash SHA-256 umożliwia weryfikację integralności treści oferty w momencie akceptacji.', L + 10, Y + 18, { width: W - 20 });
    Y += 55;
    doc.moveTo(L, Y + 10).lineTo(L + W, Y + 10).stroke('#e2e8f0');
    doc.font('Helvetica').fontSize(7).fillColor('#94a3b8')
        .text('Certificate of Acceptance | SmartQuote AI | Wygenerowano: ' + (0, helpers_1.dateTime)(new Date()), L, Y + 15, { width: W, align: 'center' });
}
