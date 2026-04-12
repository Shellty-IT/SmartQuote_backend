// smartquote_backend/src/services/pdf/contract-renderer.ts
import { PDFContract, PDFSignatureLog } from './types';
import {
    createDoc,
    txt,
    money,
    date,
    dateTime,
    contractStatusMap,
    renderItemsTable,
    tryRenderLogo,
} from './helpers';

export function renderContractPDF(contract: PDFContract): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        const doc = createDoc();

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const W = 515;
        const L = 40;
        let Y = 40;
        const ACCENT = '#059669';

        doc.rect(0, 0, 595, 50).fill(ACCENT);

        const hasLogo = tryRenderLogo(doc, contract.user.logo, L, 8, 120, 34);
        if (!hasLogo) {
            doc.font('Bold').fontSize(18).fillColor('#fff').text('SmartQuote', L, 16);
        }

        const companyName = txt(contract.user.company || contract.user.name || contract.user.email);
        const headerRightX = 340;
        const headerRightW = 215;
        doc.font('Bold').fontSize(9).fillColor('#fff').text(companyName, headerRightX, 8, { width: headerRightW, align: 'right' });
        doc.font('Regular').fontSize(7.5).fillColor('#d1fae5');
        let hY = 20;
        if (contract.user.nip) {
            doc.text('NIP: ' + contract.user.nip, headerRightX, hY, { width: headerRightW, align: 'right' });
            hY += 10;
        }
        if (contract.user.email) {
            doc.text(contract.user.email, headerRightX, hY, { width: headerRightW, align: 'right' });
            hY += 10;
        }
        if (contract.user.phone) {
            doc.text(contract.user.phone, headerRightX, hY, { width: headerRightW, align: 'right' });
        }

        Y = 60;

        doc.font('Bold').fontSize(16).fillColor('#1e293b').text('UMOWA', L, Y);
        doc.font('Regular').fontSize(10).fillColor(ACCENT).text('Nr: ' + contract.number, L + 80, Y + 2);
        Y += 28;

        const boxW = 248;
        const boxH = 90;

        doc.rect(L, Y, boxW, boxH).fill('#f1f5f9');
        doc.rect(L, Y, boxW, 16).fill(ACCENT);
        doc.font('Bold').fontSize(8).fillColor('#fff').text('WYKONAWCA', L + 8, Y + 4);
        doc.font('Bold').fontSize(9).fillColor('#1e293b').text(companyName, L + 8, Y + 20);
        doc.font('Regular').fontSize(7.5).fillColor('#475569');
        let csY = Y + 32;
        if (contract.user.nip) { doc.text('NIP: ' + contract.user.nip, L + 8, csY); csY += 10; }
        if (contract.user.address) {
            const addrLine = [contract.user.address, contract.user.postalCode, contract.user.city].filter(Boolean).join(', ');
            doc.text(addrLine, L + 8, csY, { width: boxW - 16 }); csY += 10;
        }
        if (contract.user.email) { doc.text(contract.user.email, L + 8, csY); csY += 10; }
        if (contract.user.phone) { doc.text(contract.user.phone, L + 8, csY); }

        const cbX = L + boxW + 19;
        doc.rect(cbX, Y, boxW, boxH).fill('#f1f5f9');
        doc.rect(cbX, Y, boxW, 16).fill(ACCENT);
        doc.font('Bold').fontSize(8).fillColor('#fff').text('ZLECENIODAWCA', cbX + 8, Y + 4);

        const cclient = txt(contract.client.type === 'COMPANY'
            ? (contract.client.company || contract.client.name)
            : contract.client.name);
        doc.font('Bold').fontSize(9).fillColor('#1e293b').text(cclient, cbX + 8, Y + 20);
        doc.font('Regular').fontSize(7.5).fillColor('#475569');
        let ccY = Y + 32;
        if (contract.client.nip) { doc.text('NIP: ' + contract.client.nip, cbX + 8, ccY); ccY += 10; }
        if (contract.client.address) { doc.text(txt(contract.client.address), cbX + 8, ccY); ccY += 10; }
        if (contract.client.city) {
            doc.text(txt((contract.client.postalCode || '') + ' ' + contract.client.city), cbX + 8, ccY); ccY += 10;
        }
        if (contract.client.email) { doc.text(contract.client.email, cbX + 8, ccY); }

        Y += boxH + 10;

        doc.rect(L, Y, W, 26).fill('#f1f5f9');
        const cinfos = [
            ['Data zawarcia', date(contract.createdAt)],
            ['Obowiazuje od', date(contract.startDate)],
            ['Obowiazuje do', date(contract.endDate)],
            ['Status', contractStatusMap[contract.status] || contract.status]
        ];
        const ciW = W / 4;
        cinfos.forEach(([lbl, val], i) => {
            const x = L + i * ciW + 6;
            doc.font('Regular').fontSize(7).fillColor('#64748b').text(lbl, x, Y + 4);
            doc.font('Bold').fontSize(9).fillColor('#1e293b').text(val, x, Y + 13);
        });
        Y += 32;

        if (contract.title) {
            doc.font('Bold').fontSize(11).fillColor('#1e293b').text(txt(contract.title), L, Y);
            Y += 16;
        }
        if (contract.description) {
            doc.font('Regular').fontSize(8).fillColor('#64748b').text(txt(contract.description), L, Y, { width: W });
            Y += 20;
        }

        Y = renderItemsTable(doc, contract.items, Y, ACCENT, W, L);
        Y += 12;

        const csumX = L + W - 180;
        doc.font('Regular').fontSize(9).fillColor('#1e293b').text('Netto:', csumX, Y);
        doc.font('Bold').text(money(contract.totalNet, contract.currency), csumX + 60, Y, { width: 120, align: 'right' });
        Y += 14;
        doc.font('Regular').text('VAT:', csumX, Y);
        doc.font('Bold').text(money(contract.totalVat, contract.currency), csumX + 60, Y, { width: 120, align: 'right' });
        Y += 18;
        doc.rect(csumX, Y, 180, 22).fill(ACCENT);
        doc.font('Bold').fontSize(10).fillColor('#fff').text('BRUTTO:', csumX + 8, Y + 6);
        doc.text(money(contract.totalGross, contract.currency), csumX + 60, Y + 6, { width: 112, align: 'right' });
        Y += 35;

        if (contract.terms) {
            if (Y > 680) { doc.addPage(); Y = 40; }
            doc.font('Bold').fontSize(9).fillColor('#1e293b').text('Warunki umowy:', L, Y);
            Y += 12;
            doc.font('Regular').fontSize(8).fillColor('#64748b').text(txt(contract.terms), L, Y, { width: W });
            Y += 25;
        }

        if (contract.paymentTerms) {
            if (Y > 680) { doc.addPage(); Y = 40; }
            doc.font('Bold').fontSize(9).fillColor('#1e293b').text('Warunki platnosci:', L, Y);
            Y += 12;
            doc.font('Regular').fontSize(8).fillColor('#64748b').text(txt(contract.paymentTerms), L, Y, { width: W });
            Y += 25;
        }

        doc.font('Regular').fontSize(8).fillColor('#64748b')
            .text('Termin platnosci: ' + contract.paymentDays + ' dni', L, Y);
        Y += 20;

        doc.moveTo(L, Y + 20).lineTo(L + 175, Y + 20).stroke('#cbd5e1');
        doc.font('Regular').fontSize(7).fillColor('#94a3b8').text('Podpis Wykonawcy', L, Y + 24, { width: 175, align: 'center' });
        doc.moveTo(380, Y + 20).lineTo(555, Y + 20).stroke('#cbd5e1');
        doc.font('Regular').fontSize(7).fillColor('#94a3b8').text('Podpis Zleceniodawcy', 380, Y + 24, { width: 175, align: 'center' });

        const ctargetY = 720;
        if (Y < ctargetY) Y = ctargetY;
        doc.moveTo(L, Y + 20).lineTo(L + W, Y + 20).stroke('#e2e8f0');
        doc.font('Regular').fontSize(7).fillColor('#94a3b8')
            .text('Wygenerowano w SmartQuote AI | ' + date(new Date()), L, Y + 25, { width: W, align: 'center' });

        if (contract.signatureLog) {
            renderContractSignaturePage(doc, contract, contract.signatureLog);
        }

        doc.end();
    });
}

function renderContractSignaturePage(
    doc: PDFKit.PDFDocument,
    contract: PDFContract,
    log: PDFSignatureLog
): void {
    doc.addPage();

    const W = 515;
    const L = 40;
    let Y = 40;
    const ACCENT = '#059669';
    const ACCENT_LIGHT = '#ecfdf5';

    doc.rect(0, 0, 595, 50).fill(ACCENT);
    doc.font('Bold').fontSize(16).fillColor('#fff').text('CERTIFICATE OF SIGNATURE', L, 10);
    doc.font('Regular').fontSize(9).fillColor('#d1fae5').text('Formalne potwierdzenie podpisu umowy', L, 30);
    doc.font('Regular').fontSize(8).fillColor('#fff').text('SmartQuote AI', 400, 10, { width: 155, align: 'right' });
    doc.text(dateTime(log.signedAt), 400, 22, { width: 155, align: 'right' });

    Y = 65;

    doc.rect(L, Y, W, 55).fill(ACCENT_LIGHT).stroke('#a7f3d0');
    doc.font('Bold').fontSize(10).fillColor('#065f46').text('Umowa podpisana', L + 15, Y + 8);
    doc.font('Regular').fontSize(9).fillColor('#047857').text(txt(contract.title), L + 15, Y + 22);
    doc.font('Bold').fontSize(9).fillColor('#065f46').text('Nr: ' + contract.number, L + 15, Y + 36);
    doc.font('Bold').fontSize(12).fillColor('#065f46')
        .text(money(log.totalGross, log.currency), 350, Y + 18, { width: W - 350 + L - 15, align: 'right' });

    Y += 70;

    const colW = (W - 15) / 2;

    doc.rect(L, Y, colW, 16).fill(ACCENT);
    doc.font('Bold').fontSize(8).fillColor('#fff').text('PODPISUJACY', L + 8, Y + 4);
    doc.rect(L, Y + 16, colW, 50).fill('#f8fafc').stroke('#e2e8f0');
    doc.font('Bold').fontSize(9).fillColor('#1e293b').text(txt(log.signerName), L + 8, Y + 22);
    doc.font('Regular').fontSize(8).fillColor('#64748b').text(log.signerEmail, L + 8, Y + 34);

    const rX = L + colW + 15;
    doc.rect(rX, Y, colW, 16).fill(ACCENT);
    doc.font('Bold').fontSize(8).fillColor('#fff').text('WYKONAWCA', rX + 8, Y + 4);
    doc.rect(rX, Y + 16, colW, 50).fill('#f8fafc').stroke('#e2e8f0');
    const seller = txt(contract.user.company || contract.user.name || '');
    doc.font('Bold').fontSize(9).fillColor('#1e293b').text(seller, rX + 8, Y + 22);
    doc.font('Regular').fontSize(8).fillColor('#64748b').text(contract.user.email, rX + 8, Y + 34);

    Y += 80;

    doc.rect(L, Y, W, 16).fill('#0f172a');
    doc.font('Bold').fontSize(8).fillColor('#fff').text('PODPIS ELEKTRONICZNY', L + 8, Y + 4);
    Y += 16;

    doc.rect(L, Y, W, 90).fill('#fff').stroke('#e2e8f0');
    try {
        const base64Data = log.signatureImage.replace(/^data:image\/\w+;base64,/, '');
        const imgBuffer = Buffer.from(base64Data, 'base64');
        const imgX = L + (W - 250) / 2;
        doc.image(imgBuffer, imgX, Y + 5, { width: 250, height: 80, fit: [250, 80], align: 'center', valign: 'center' });
    } catch {
        doc.font('Regular').fontSize(9).fillColor('#94a3b8')
            .text('[Podpis niedostepny]', L + 8, Y + 35, { width: W - 16, align: 'center' });
    }
    Y += 94;

    doc.rect(L, Y, W, 16).fill('#0f172a');
    doc.font('Bold').fontSize(8).fillColor('#fff').text('SZCZEGOLY PODPISU', L + 8, Y + 4);
    Y += 16;

    const details: [string, string][] = [
        ['Data i czas podpisu', dateTime(log.signedAt)],
        ['Kwota netto', money(log.totalNet, log.currency)],
        ['Kwota VAT', money(log.totalVat, log.currency)],
        ['Kwota brutto', money(log.totalGross, log.currency)],
        ['Adres IP', log.ipAddress],
        ['Zleceniodawca', txt(contract.client.type === 'COMPANY'
            ? (contract.client.company || contract.client.name)
            : contract.client.name)],
    ];

    if (contract.client.nip) {
        details.push(['NIP zleceniodawcy', contract.client.nip]);
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
            'Hash SHA-256 wygenerowany z zawartosci umowy (pozycje, ceny, waluta). ' +
            'Sluzy do weryfikacji integralnosci danych w momencie podpisu.',
            L, Y + 4, { width: W }
        );
    Y += 28;

    doc.rect(L, Y, W, 45).fill(ACCENT_LIGHT).stroke('#a7f3d0');
    doc.font('Bold').fontSize(8).fillColor('#065f46').text('Oswiadczenie', L + 10, Y + 6);
    doc.font('Regular').fontSize(7).fillColor('#047857')
        .text(
            'Niniejszy certyfikat potwierdza, ze osoba wskazana powyzej podpisala umowe ' +
            'nr ' + contract.number + ' w dniu ' + dateTime(log.signedAt) + '. ' +
            'Podpis elektroniczny i dane zostaly zarejestrowane automatycznie przez system SmartQuote AI i sa niemodyfikowalne. ' +
            'Hash SHA-256 umozliwia weryfikacje integralnosci tresci umowy w momencie podpisu.',
            L + 10, Y + 18, { width: W - 20 }
        );

    Y += 55;

    doc.moveTo(L, Y + 10).lineTo(L + W, Y + 10).stroke('#e2e8f0');
    doc.font('Regular').fontSize(7).fillColor('#94a3b8')
        .text(
            'Certificate of Signature | SmartQuote AI | Wygenerowano: ' + dateTime(new Date()),
            L, Y + 15, { width: W, align: 'center' }
        );
}