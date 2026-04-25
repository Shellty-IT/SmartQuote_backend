// smartquote_backend/src/services/pdf/offer-renderer.ts
import { PDFOffer, PDFAcceptanceLog } from './types';
import {
    createDoc,
    txt,
    money,
    date,
    dateTime,
    statusMap,
    groupItemsByVariant,
    renderItemsTable,
    tryRenderLogo,
} from './helpers';

export function renderOfferPDF(offer: PDFOffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        const doc = createDoc();

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const W = 515;
        const L = 40;
        let Y = 40;
        const ACCENT = '#0891b2';

        doc.rect(0, 0, 595, 50).fill(ACCENT);

        const hasLogo = tryRenderLogo(doc, offer.user.logo, L, 8, 120, 34);
        if (!hasLogo) {
            doc.font('Bold').fontSize(18).fillColor('#fff').text('SmartQuote', L, 16);
        }

        const companyName = txt(offer.user.company || offer.user.name || offer.user.email);
        const headerRightX = 340;
        const headerRightW = 215;
        doc.font('Bold').fontSize(9).fillColor('#fff').text(companyName, headerRightX, 8, { width: headerRightW, align: 'right' });
        doc.font('Regular').fontSize(7.5).fillColor('#e0f2fe');
        let hY = 20;
        if (offer.user.nip) {
            doc.text('NIP: ' + offer.user.nip, headerRightX, hY, { width: headerRightW, align: 'right' });
            hY += 10;
        }
        if (offer.user.email) {
            doc.text(offer.user.email, headerRightX, hY, { width: headerRightW, align: 'right' });
            hY += 10;
        }
        if (offer.user.phone) {
            doc.text(offer.user.phone, headerRightX, hY, { width: headerRightW, align: 'right' });
        }

        Y = 60;

        doc.font('Bold').fontSize(16).fillColor('#1e293b').text('OFERTA HANDLOWA', L, Y);
        Y += 6;
        doc.font('Regular').fontSize(10).fillColor(ACCENT).text('Nr: ' + offer.number, L, Y + 16);
        Y += 34;

        const boxW = 248;
        const boxH = 80;

        doc.rect(L, Y, boxW, boxH).fill('#f1f5f9');
        doc.rect(L, Y, boxW, 16).fill(ACCENT);
        doc.font('Bold').fontSize(8).fillColor('#fff').text('SPRZEDAWCA', L + 8, Y + 4);
        doc.font('Bold').fontSize(9).fillColor('#1e293b').text(companyName, L + 8, Y + 20);
        doc.font('Regular').fontSize(7.5).fillColor('#475569');
        let sY = Y + 32;
        if (offer.user.nip) { doc.text('NIP: ' + offer.user.nip, L + 8, sY); sY += 10; }
        if (offer.user.address) {
            const addrLine = [offer.user.address, offer.user.postalCode, offer.user.city].filter(Boolean).join(', ');
            doc.text(addrLine, L + 8, sY, { width: boxW - 16 }); sY += 10;
        }
        if (offer.user.email) { doc.text(offer.user.email, L + 8, sY); sY += 10; }
        if (offer.user.phone) { doc.text(offer.user.phone, L + 8, sY); }

        const bX = L + boxW + 19;
        doc.rect(bX, Y, boxW, boxH).fill('#f1f5f9');
        doc.rect(bX, Y, boxW, 16).fill(ACCENT);
        doc.font('Bold').fontSize(8).fillColor('#fff').text('NABYWCA', bX + 8, Y + 4);

        const clientName = txt(offer.client.type === 'COMPANY'
            ? (offer.client.company || offer.client.name)
            : offer.client.name);
        doc.font('Bold').fontSize(9).fillColor('#1e293b').text(clientName, bX + 8, Y + 20);
        doc.font('Regular').fontSize(7.5).fillColor('#475569');
        let cY = Y + 32;
        if (offer.client.nip) { doc.text('NIP: ' + offer.client.nip, bX + 8, cY); cY += 10; }
        if (offer.client.address) { doc.text(txt(offer.client.address), bX + 8, cY); cY += 10; }
        if (offer.client.city) {
            doc.text(txt((offer.client.postalCode || '') + ' ' + offer.client.city), bX + 8, cY); cY += 10;
        }
        if (offer.client.email) { doc.text(offer.client.email, bX + 8, cY); }

        Y += boxH + 10;

        doc.rect(L, Y, W, 26).fill('#f1f5f9');
        const infos = [
            ['Data', date(offer.createdAt)],
            ['Wa\u017cna do', date(offer.validUntil)],
            ['Status', statusMap[offer.status] || offer.status],
            ['P\u0142atno\u015b\u0107', offer.paymentDays + ' dni']
        ];
        const iW = W / 4;
        infos.forEach(([lbl, val], i) => {
            const x = L + i * iW + 6;
            doc.font('Regular').fontSize(7).fillColor('#64748b').text(lbl, x, Y + 4);
            doc.font('Bold').fontSize(9).fillColor('#1e293b').text(val, x, Y + 13);
        });
        Y += 32;

        if (offer.title) {
            doc.font('Bold').fontSize(11).fillColor('#1e293b').text(txt(offer.title), L, Y);
            Y += 16;
        }
        if (offer.description) {
            doc.font('Regular').fontSize(8).fillColor('#64748b').text(txt(offer.description), L, Y, { width: W });
            Y += 20;
        }

        const variantGroups = groupItemsByVariant(offer.items);
        const hasVariants = variantGroups.some(g => g.name !== null);

        for (const group of variantGroups) {
            if (Y > 650) { doc.addPage(); Y = 40; }

            if (hasVariants) {
                const label = group.name ? 'Wariant: ' + txt(group.name) : 'Pozycje wsp\u00f3lne';
                doc.rect(L, Y, W, 20).fill(group.name ? '#ecfeff' : '#f1f5f9');
                doc.font('Bold').fontSize(9)
                    .fillColor(group.name ? '#0891b2' : '#475569')
                    .text(label, L + 8, Y + 5);
                Y += 24;
            }

            Y = renderItemsTable(doc, group.items, Y, ACCENT, W, L);

            if (hasVariants) {
                const subX = L + W - 160;
                Y += 4;
                doc.font('Regular').fontSize(8).fillColor('#64748b').text('Netto sekcji:', subX, Y);
                doc.font('Bold').fontSize(8).fillColor('#1e293b')
                    .text(money(group.totalNet, offer.currency), subX + 70, Y, { width: 90, align: 'right' });
                Y += 12;
                doc.font('Regular').fontSize(8).fillColor('#64748b').text('Brutto sekcji:', subX, Y);
                doc.font('Bold').fontSize(8).fillColor('#1e293b')
                    .text(money(group.totalGross, offer.currency), subX + 70, Y, { width: 90, align: 'right' });
                Y += 16;
            }

            Y += 8;
        }

        Y += 4;
        const sumX = L + W - 180;
        doc.font('Regular').fontSize(9).fillColor('#1e293b').text('Netto:', sumX, Y);
        doc.font('Bold').text(money(offer.totalNet, offer.currency), sumX + 60, Y, { width: 120, align: 'right' });
        Y += 14;
        doc.font('Regular').text('VAT:', sumX, Y);
        doc.font('Bold').text(money(offer.totalVat, offer.currency), sumX + 60, Y, { width: 120, align: 'right' });
        Y += 18;
        doc.rect(sumX, Y, 180, 22).fill(ACCENT);
        doc.font('Bold').fontSize(10).fillColor('#fff').text('BRUTTO:', sumX + 8, Y + 6);
        doc.text(money(offer.totalGross, offer.currency), sumX + 60, Y + 6, { width: 112, align: 'right' });
        Y += 35;

        if (hasVariants) {
            doc.font('Regular').fontSize(7).fillColor('#94a3b8')
                .text('* Kwota brutto dotyczy pozycji wsp\u00f3lnych + pierwszego wariantu', L, Y);
            Y += 15;
        }

        if (offer.terms) {
            if (Y > 680) { doc.addPage(); Y = 40; }
            doc.font('Bold').fontSize(9).fillColor('#1e293b').text('Warunki:', L, Y);
            Y += 12;
            doc.font('Regular').fontSize(8).fillColor('#64748b').text(txt(offer.terms), L, Y, { width: W });
            Y += 25;
        }

        doc.moveTo(380, Y + 20).lineTo(555, Y + 20).stroke('#cbd5e1');
        doc.font('Regular').fontSize(7).fillColor('#94a3b8').text('Podpis', 380, Y + 24, { width: 175, align: 'center' });

        const targetY = 720;
        if (Y < targetY) Y = targetY;
        doc.moveTo(L, Y + 20).lineTo(L + W, Y + 20).stroke('#e2e8f0');
        doc.font('Regular').fontSize(7).fillColor('#94a3b8')
            .text('Wygenerowano w SmartQuote AI | ' + date(new Date()), L, Y + 25, { width: W, align: 'center' });

        if (offer.acceptanceLog) {
            renderAuditTrailPage(doc, offer, offer.acceptanceLog);
        }

        doc.end();
    });
}

function renderAuditTrailPage(
    doc: PDFKit.PDFDocument,
    offer: PDFOffer,
    log: PDFAcceptanceLog
): void {
    doc.addPage();

    const W = 515;
    const L = 40;
    let Y = 40;
    const ACCENT = '#059669';
    const ACCENT_LIGHT = '#ecfdf5';

    doc.rect(0, 0, 595, 50).fill(ACCENT);
    doc.font('Bold').fontSize(16).fillColor('#fff')
        .text('CERTIFICATE OF ACCEPTANCE', L, 10);
    doc.font('Regular').fontSize(9).fillColor('#d1fae5')
        .text('Formalne potwierdzenie akceptacji oferty', L, 30);
    doc.font('Regular').fontSize(8).fillColor('#fff')
        .text('SmartQuote AI', 400, 10, { width: 155, align: 'right' });
    doc.text(dateTime(log.acceptedAt), 400, 22, { width: 155, align: 'right' });

    Y = 65;

    doc.rect(L, Y, W, 55).fill(ACCENT_LIGHT).stroke('#a7f3d0');
    doc.font('Bold').fontSize(10).fillColor('#065f46')
        .text('Oferta zaakceptowana', L + 15, Y + 8);
    doc.font('Regular').fontSize(9).fillColor('#047857')
        .text(txt(offer.title), L + 15, Y + 22);
    doc.font('Bold').fontSize(9).fillColor('#065f46')
        .text('Nr: ' + offer.number, L + 15, Y + 36);
    doc.font('Bold').fontSize(12).fillColor('#065f46')
        .text(money(log.totalGross, log.currency), 350, Y + 18, { width: W - 350 + L - 15, align: 'right' });

    Y += 70;

    const colW = (W - 15) / 2;

    doc.rect(L, Y, colW, 16).fill(ACCENT);
    doc.font('Bold').fontSize(8).fillColor('#fff').text('AKCEPTUJ\u0104CY', L + 8, Y + 4);
    doc.rect(L, Y + 16, colW, 50).fill('#f8fafc').stroke('#e2e8f0');
    doc.font('Bold').fontSize(9).fillColor('#1e293b').text(txt(log.clientName || '-'), L + 8, Y + 22);
    doc.font('Regular').fontSize(8).fillColor('#64748b').text(log.clientEmail || '-', L + 8, Y + 34);

    const rX = L + colW + 15;
    doc.rect(rX, Y, colW, 16).fill(ACCENT);
    doc.font('Bold').fontSize(8).fillColor('#fff').text('SPRZEDAWCA', rX + 8, Y + 4);
    doc.rect(rX, Y + 16, colW, 50).fill('#f8fafc').stroke('#e2e8f0');
    const seller = txt(offer.user.company || offer.user.name || '');
    doc.font('Bold').fontSize(9).fillColor('#1e293b').text(seller, rX + 8, Y + 22);
    doc.font('Regular').fontSize(8).fillColor('#64748b').text(offer.user.email, rX + 8, Y + 34);

    Y += 80;

    doc.rect(L, Y, W, 16).fill('#0f172a');
    doc.font('Bold').fontSize(8).fillColor('#fff').text('SZCZEG\u00d3\u0141Y AKCEPTACJI', L + 8, Y + 4);
    Y += 16;

    const details: [string, string][] = [
        ['Data i czas akceptacji', dateTime(log.acceptedAt)],
        ['Kwota netto', money(log.totalNet, log.currency)],
        ['Kwota VAT', money(log.totalVat, log.currency)],
        ['Kwota brutto', money(log.totalGross, log.currency)],
    ];

    if (log.selectedVariant) {
        details.push(['Wybrany wariant', txt(log.selectedVariant)]);
    }

    details.push(
        ['Adres IP', log.ipAddress],
        ['Klient (nabywca)', txt(offer.client.type === 'COMPANY'
            ? (offer.client.company || offer.client.name)
            : offer.client.name)],
    );

    if (offer.client.nip) {
        details.push(['NIP nabywcy', offer.client.nip]);
    }

    details.forEach(([label, value], idx) => {
        const bg = idx % 2 === 0 ? '#fff' : '#f8fafc';
        doc.rect(L, Y, W, 18).fill(bg).stroke('#e2e8f0');
        doc.font('Regular').fontSize(8).fillColor('#64748b').text(label, L + 8, Y + 5);
        doc.font('Bold').fontSize(8).fillColor('#1e293b')
            .text(value, L + 200, Y + 5, { width: W - 208, align: 'right' });
        Y += 18;
    });

    Y += 10;

    doc.rect(L, Y, W, 16).fill('#0f172a');
    doc.font('Bold').fontSize(8).fillColor('#fff').text('USER AGENT', L + 8, Y + 4);
    Y += 16;

    doc.rect(L, Y, W, 28).fill('#f8fafc').stroke('#e2e8f0');
    const uaTruncated = log.userAgent.length > 120 ? log.userAgent.slice(0, 120) + '...' : log.userAgent;
    doc.font('Mono').fontSize(6).fillColor('#64748b').text(uaTruncated, L + 8, Y + 4, { width: W - 16 });
    Y += 32;

    Y += 10;

    doc.rect(L, Y, W, 16).fill('#0f172a');
    doc.font('Bold').fontSize(8).fillColor('#fff').text('CONTENT HASH (SHA-256)', L + 8, Y + 4);
    Y += 16;

    doc.rect(L, Y, W, 24).fill('#0f172a').stroke('#1e293b');
    doc.font('Mono').fontSize(7).fillColor('#34d399').text(log.contentHash, L + 8, Y + 8, { width: W - 16 });
    Y += 28;

    doc.font('Regular').fontSize(7).fillColor('#64748b')
        .text(
            'Hash SHA-256 wygenerowany z zawarto\u015bci oferty (pozycje, ceny, wariant, waluta). ' +
            'S\u0142u\u017cy do weryfikacji integralno\u015bci danych w momencie akceptacji.',
            L, Y + 4, { width: W }
        );
    Y += 28;

    doc.rect(L, Y, W, 45).fill(ACCENT_LIGHT).stroke('#a7f3d0');
    doc.font('Bold').fontSize(8).fillColor('#065f46').text('O\u015bwiadczenie', L + 10, Y + 6);
    doc.font('Regular').fontSize(7).fillColor('#047857')
        .text(
            'Niniejszy certyfikat potwierdza, \u017ce osoba wskazana powy\u017cej zaakceptowa\u0142a ofert\u0119 ' +
            'nr ' + offer.number + ' w dniu ' + dateTime(log.acceptedAt) + '. ' +
            'Dane zosta\u0142y zarejestrowane automatycznie przez system SmartQuote AI i s\u0105 niemodyfikowalne. ' +
            'Hash SHA-256 umo\u017cliwia weryfikacj\u0119 integralno\u015bci tre\u015bci oferty w momencie akceptacji.',
            L + 10, Y + 18, { width: W - 20 }
        );

    Y += 55;

    doc.moveTo(L, Y + 10).lineTo(L + W, Y + 10).stroke('#e2e8f0');
    doc.font('Regular').fontSize(7).fillColor('#94a3b8')
        .text(
            'Certificate of Acceptance | SmartQuote AI | Wygenerowano: ' + dateTime(new Date()),
            L, Y + 15, { width: W, align: 'center' }
        );
}