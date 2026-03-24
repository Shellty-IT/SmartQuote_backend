"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderContractPDF = renderContractPDF;
// smartquote_backend/src/services/pdf/contract-renderer.ts
const pdfkit_1 = __importDefault(require("pdfkit"));
const helpers_1 = require("./helpers");
function renderContractPDF(contract) {
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
        const ACCENT = '#059669';
        doc.rect(0, 0, 595, 45).fill(ACCENT);
        doc.font('Helvetica-Bold').fontSize(18).fillColor('#fff').text('SmartQuote', L, 14);
        const company = (0, helpers_1.txt)(contract.user.company || contract.user.name || '');
        doc.font('Helvetica').fontSize(8).text(company, 350, 10, { width: 200, align: 'right' });
        if (contract.user.email)
            doc.text(contract.user.email, 350, 20, { width: 200, align: 'right' });
        if (contract.user.phone)
            doc.text(contract.user.phone, 350, 30, { width: 200, align: 'right' });
        Y = 55;
        doc.font('Helvetica-Bold').fontSize(16).fillColor('#1e293b').text('UMOWA', L, Y);
        doc.font('Helvetica').fontSize(10).fillColor(ACCENT).text('Nr: ' + contract.number, L + 80, Y + 2);
        Y += 28;
        const boxW = 248;
        const boxH = 80;
        doc.rect(L, Y, boxW, boxH).fill('#f1f5f9');
        doc.rect(L, Y, boxW, 16).fill(ACCENT);
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#fff').text('WYKONAWCA', L + 8, Y + 4);
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b').text(company, L + 8, Y + 22);
        doc.font('Helvetica').fontSize(8);
        let csY = Y + 34;
        if (contract.user.email) {
            doc.text(contract.user.email, L + 8, csY);
            csY += 10;
        }
        if (contract.user.phone) {
            doc.text(contract.user.phone, L + 8, csY);
        }
        const cbX = L + boxW + 19;
        doc.rect(cbX, Y, boxW, boxH).fill('#f1f5f9');
        doc.rect(cbX, Y, boxW, 16).fill(ACCENT);
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#fff').text('ZLECENIODAWCA', cbX + 8, Y + 4);
        const cclient = (0, helpers_1.txt)(contract.client.type === 'COMPANY' ? (contract.client.company || contract.client.name) : contract.client.name);
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b').text(cclient, cbX + 8, Y + 22);
        doc.font('Helvetica').fontSize(8);
        let ccY = Y + 34;
        if (contract.client.nip) {
            doc.text('NIP: ' + contract.client.nip, cbX + 8, ccY);
            ccY += 10;
        }
        if (contract.client.address) {
            doc.text((0, helpers_1.txt)(contract.client.address), cbX + 8, ccY);
            ccY += 10;
        }
        if (contract.client.city) {
            doc.text((0, helpers_1.txt)((contract.client.postalCode || '') + ' ' + (contract.client.city || '')), cbX + 8, ccY);
            ccY += 10;
        }
        if (contract.client.email) {
            doc.text(contract.client.email, cbX + 8, ccY);
        }
        Y += boxH + 10;
        doc.rect(L, Y, W, 26).fill('#f1f5f9');
        const cinfos = [
            ['Data zawarcia', (0, helpers_1.date)(contract.createdAt)],
            ['Obowiązuje od', (0, helpers_1.date)(contract.startDate)],
            ['Obowiązuje do', (0, helpers_1.date)(contract.endDate)],
            ['Status', helpers_1.contractStatusMap[contract.status] || contract.status]
        ];
        const ciW = W / 4;
        cinfos.forEach(([lbl, val], i) => {
            const x = L + i * ciW + 6;
            doc.font('Helvetica').fontSize(7).fillColor('#64748b').text(lbl, x, Y + 4);
            doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b').text(val, x, Y + 13);
        });
        Y += 32;
        if (contract.title) {
            doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e293b').text((0, helpers_1.txt)(contract.title), L, Y);
            Y += 15;
        }
        if (contract.description) {
            doc.font('Helvetica').fontSize(8).fillColor('#64748b').text((0, helpers_1.txt)(contract.description), L, Y, { width: W });
            Y += 15;
        }
        Y = (0, helpers_1.renderItemsTable)(doc, contract.items, Y, ACCENT, W, L);
        Y += 12;
        const csumX = L + W - 180;
        doc.font('Helvetica').fontSize(9).fillColor('#1e293b').text('Netto:', csumX, Y);
        doc.font('Helvetica-Bold').text((0, helpers_1.money)(contract.totalNet, contract.currency), csumX + 60, Y, { width: 120, align: 'right' });
        Y += 14;
        doc.font('Helvetica').text('VAT:', csumX, Y);
        doc.font('Helvetica-Bold').text((0, helpers_1.money)(contract.totalVat, contract.currency), csumX + 60, Y, { width: 120, align: 'right' });
        Y += 18;
        doc.rect(csumX, Y, 180, 22).fill(ACCENT);
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#fff').text('BRUTTO:', csumX + 8, Y + 6);
        doc.text((0, helpers_1.money)(contract.totalGross, contract.currency), csumX + 60, Y + 6, { width: 112, align: 'right' });
        Y += 35;
        if (contract.terms) {
            if (Y > 680) {
                doc.addPage();
                Y = 40;
            }
            doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b').text('Warunki umowy:', L, Y);
            Y += 12;
            doc.font('Helvetica').fontSize(8).fillColor('#64748b').text((0, helpers_1.txt)(contract.terms), L, Y, { width: W });
            Y += 25;
        }
        if (contract.paymentTerms) {
            if (Y > 680) {
                doc.addPage();
                Y = 40;
            }
            doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b').text('Warunki płatności:', L, Y);
            Y += 12;
            doc.font('Helvetica').fontSize(8).fillColor('#64748b').text((0, helpers_1.txt)(contract.paymentTerms), L, Y, { width: W });
            Y += 25;
        }
        doc.font('Helvetica').fontSize(8).fillColor('#64748b').text('Termin płatności: ' + contract.paymentDays + ' dni', L, Y);
        Y += 20;
        doc.moveTo(L, Y + 20).lineTo(L + 175, Y + 20).stroke('#cbd5e1');
        doc.font('Helvetica').fontSize(7).fillColor('#94a3b8').text('Podpis Wykonawcy', L, Y + 24, { width: 175, align: 'center' });
        doc.moveTo(380, Y + 20).lineTo(555, Y + 20).stroke('#cbd5e1');
        doc.font('Helvetica').fontSize(7).fillColor('#94a3b8').text('Podpis Zleceniodawcy', 380, Y + 24, { width: 175, align: 'center' });
        const ctargetY = 720;
        if (Y < ctargetY)
            Y = ctargetY;
        doc.moveTo(L, Y + 20).lineTo(L + W, Y + 20).stroke('#e2e8f0');
        doc.font('Helvetica').fontSize(7).fillColor('#94a3b8')
            .text('Wygenerowano w SmartQuote AI | ' + (0, helpers_1.date)(new Date()), L, Y + 25, { width: W, align: 'center' });
        if (contract.signatureLog) {
            renderContractSignaturePage(doc, contract, contract.signatureLog);
        }
        doc.end();
    });
}
function renderContractSignaturePage(doc, contract, log) {
    doc.addPage();
    const W = 515;
    const L = 40;
    let Y = 40;
    const ACCENT = '#059669';
    const ACCENT_LIGHT = '#ecfdf5';
    doc.rect(0, 0, 595, 50).fill(ACCENT);
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#fff')
        .text('CERTIFICATE OF SIGNATURE', L, 10);
    doc.font('Helvetica').fontSize(9).fillColor('#d1fae5')
        .text('Formalne potwierdzenie podpisu umowy', L, 30);
    doc.font('Helvetica').fontSize(8).fillColor('#fff')
        .text('SmartQuote AI', 400, 10, { width: 155, align: 'right' });
    doc.text((0, helpers_1.dateTime)(log.signedAt), 400, 22, { width: 155, align: 'right' });
    Y = 65;
    doc.rect(L, Y, W, 55).fill(ACCENT_LIGHT).stroke('#a7f3d0');
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#065f46')
        .text('Umowa podpisana', L + 15, Y + 8);
    doc.font('Helvetica').fontSize(9).fillColor('#047857')
        .text((0, helpers_1.txt)(contract.title), L + 15, Y + 22);
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#065f46')
        .text('Nr: ' + contract.number, L + 15, Y + 36);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#065f46')
        .text((0, helpers_1.money)(log.totalGross, log.currency), 350, Y + 18, { width: W - 350 + L - 15, align: 'right' });
    Y += 70;
    const colW = (W - 15) / 2;
    doc.rect(L, Y, colW, 16).fill(ACCENT);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#fff').text('PODPISUJĄCY', L + 8, Y + 4);
    doc.rect(L, Y + 16, colW, 50).fill('#f8fafc').stroke('#e2e8f0');
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b')
        .text((0, helpers_1.txt)(log.signerName), L + 8, Y + 22);
    doc.font('Helvetica').fontSize(8).fillColor('#64748b')
        .text(log.signerEmail, L + 8, Y + 34);
    const rX = L + colW + 15;
    doc.rect(rX, Y, colW, 16).fill(ACCENT);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#fff').text('WYKONAWCA', rX + 8, Y + 4);
    doc.rect(rX, Y + 16, colW, 50).fill('#f8fafc').stroke('#e2e8f0');
    const seller = (0, helpers_1.txt)(contract.user.company || contract.user.name || '');
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b')
        .text(seller, rX + 8, Y + 22);
    doc.font('Helvetica').fontSize(8).fillColor('#64748b')
        .text(contract.user.email, rX + 8, Y + 34);
    Y += 80;
    doc.rect(L, Y, W, 16).fill('#0f172a');
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#fff')
        .text('PODPIS ELEKTRONICZNY', L + 8, Y + 4);
    Y += 16;
    doc.rect(L, Y, W, 90).fill('#fff').stroke('#e2e8f0');
    try {
        const base64Data = log.signatureImage.replace(/^data:image\/\w+;base64,/, '');
        const imgBuffer = Buffer.from(base64Data, 'base64');
        const imgX = L + (W - 250) / 2;
        doc.image(imgBuffer, imgX, Y + 5, { width: 250, height: 80, fit: [250, 80], align: 'center', valign: 'center' });
    }
    catch {
        doc.font('Helvetica').fontSize(9).fillColor('#94a3b8')
            .text('[Podpis niedostępny]', L + 8, Y + 35, { width: W - 16, align: 'center' });
    }
    Y += 94;
    doc.rect(L, Y, W, 16).fill('#0f172a');
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#fff')
        .text('SZCZEGÓŁY PODPISU', L + 8, Y + 4);
    Y += 16;
    const details = [
        ['Data i czas podpisu', (0, helpers_1.dateTime)(log.signedAt)],
        ['Kwota netto', (0, helpers_1.money)(log.totalNet, log.currency)],
        ['Kwota VAT', (0, helpers_1.money)(log.totalVat, log.currency)],
        ['Kwota brutto', (0, helpers_1.money)(log.totalGross, log.currency)],
        ['Adres IP', log.ipAddress],
        ['Zleceniodawca', (0, helpers_1.txt)(contract.client.type === 'COMPANY' ? (contract.client.company || contract.client.name) : contract.client.name)],
    ];
    if (contract.client.nip) {
        details.push(['NIP zleceniodawcy', contract.client.nip]);
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
        .text('Hash SHA-256 wygenerowany z zawartości umowy (pozycje, ceny, waluta). ' +
        'Służy do weryfikacji integralności danych w momencie podpisu.', L, Y + 4, { width: W });
    Y += 28;
    doc.rect(L, Y, W, 45).fill(ACCENT_LIGHT).stroke('#a7f3d0');
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#065f46')
        .text('Oświadczenie', L + 10, Y + 6);
    doc.font('Helvetica').fontSize(7).fillColor('#047857')
        .text('Niniejszy certyfikat potwierdza, że osoba wskazana powyżej podpisała umowę ' +
        'nr ' + contract.number + ' w dniu ' + (0, helpers_1.dateTime)(log.signedAt) + '. ' +
        'Podpis elektroniczny i dane zostały zarejestrowane automatycznie przez system SmartQuote AI i są niemodyfikowalne. ' +
        'Hash SHA-256 umożliwia weryfikację integralności treści umowy w momencie podpisu.', L + 10, Y + 18, { width: W - 20 });
    Y += 55;
    doc.moveTo(L, Y + 10).lineTo(L + W, Y + 10).stroke('#e2e8f0');
    doc.font('Helvetica').fontSize(7).fillColor('#94a3b8')
        .text('Certificate of Signature | SmartQuote AI | Wygenerowano: ' + (0, helpers_1.dateTime)(new Date()), L, Y + 15, { width: W, align: 'center' });
}
