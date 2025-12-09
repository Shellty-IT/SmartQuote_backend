"use strict";
// smartquote_backend/src/services/pdf.service.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pdfService = exports.PDFService = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const pl = (str) => {
    const map = {
        'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
        'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
    };
    return str.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, c => map[c] || c);
};
const txt = (text) => text ? pl(text) : '';
const money = (amount, cur = 'PLN') => {
    const n = typeof amount === 'number' ? amount : Number(amount);
    return n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + cur;
};
const date = (d) => {
    if (!d)
        return '-';
    return new Date(d).toLocaleDateString('pl-PL');
};
const statusMap = {
    DRAFT: 'Szkic', SENT: 'Wyslana', VIEWED: 'Wyswietlona', NEGOTIATION: 'Negocjacje',
    ACCEPTED: 'Zaakceptowana', REJECTED: 'Odrzucona', EXPIRED: 'Wygasla'
};
const contractStatusMap = {
    DRAFT: 'Szkic', PENDING_SIGNATURE: 'Do podpisu', ACTIVE: 'Aktywna',
    COMPLETED: 'Zakonczona', TERMINATED: 'Rozwiazana', EXPIRED: 'Wygasla'
};
class PDFService {
    generateOfferPDF(offer) {
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
            // === HEADER ===
            doc.rect(0, 0, 595, 45).fill('#0891b2');
            doc.font('Helvetica-Bold').fontSize(18).fillColor('#fff').text('SmartQuote', L, 14);
            const company = txt(offer.user.company || offer.user.name || '');
            doc.font('Helvetica').fontSize(8).text(company, 350, 10, { width: 200, align: 'right' });
            if (offer.user.email)
                doc.text(offer.user.email, 350, 20, { width: 200, align: 'right' });
            if (offer.user.phone)
                doc.text(offer.user.phone, 350, 30, { width: 200, align: 'right' });
            Y = 55;
            // === TITLE ===
            doc.font('Helvetica-Bold').fontSize(16).fillColor('#1e293b').text('OFERTA HANDLOWA', L, Y);
            doc.font('Helvetica').fontSize(10).fillColor('#0891b2').text('Nr: ' + offer.number, L + 170, Y + 2);
            Y += 28;
            // === PARTIES ===
            const boxW = 248;
            const boxH = 70;
            // Seller
            doc.rect(L, Y, boxW, boxH).fill('#f1f5f9');
            doc.rect(L, Y, boxW, 16).fill('#0891b2');
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
            // Buyer
            const bX = L + boxW + 19;
            doc.rect(bX, Y, boxW, boxH).fill('#f1f5f9');
            doc.rect(bX, Y, boxW, 16).fill('#0891b2');
            doc.font('Helvetica-Bold').fontSize(8).fillColor('#fff').text('NABYWCA', bX + 8, Y + 4);
            const client = txt(offer.client.type === 'COMPANY' ? (offer.client.company || offer.client.name) : offer.client.name);
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
            // === INFO BAR ===
            doc.rect(L, Y, W, 26).fill('#f1f5f9');
            const infos = [
                ['Data', date(offer.createdAt)],
                ['Wazna do', date(offer.validUntil)],
                ['Status', statusMap[offer.status] || offer.status],
                ['Platnosc', offer.paymentDays + ' dni']
            ];
            const iW = W / 4;
            infos.forEach(([lbl, val], i) => {
                const x = L + i * iW + 6;
                doc.font('Helvetica').fontSize(7).fillColor('#64748b').text(lbl, x, Y + 4);
                doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b').text(val, x, Y + 13);
            });
            Y += 32;
            // === OFFER TITLE & DESC ===
            if (offer.title) {
                doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e293b').text(txt(offer.title), L, Y);
                Y += 15;
            }
            if (offer.description) {
                doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(txt(offer.description), L, Y, { width: W });
                Y += 15;
            }
            // === TABLE ===
            const cols = [22, 175, 40, 30, 58, 35, 35, 70];
            const headers = ['Lp', 'Nazwa', 'Ilosc', 'Jm', 'Cena', 'VAT', 'Rabat', 'Netto'];
            const tW = cols.reduce((a, b) => a + b, 0);
            const tX = L + (W - tW) / 2;
            // Header
            doc.rect(tX, Y, tW, 18).fill('#0891b2');
            let x = tX;
            doc.font('Helvetica-Bold').fontSize(7).fillColor('#fff');
            headers.forEach((h, i) => {
                doc.text(h, x + 2, Y + 5, { width: cols[i] - 4, align: 'center' });
                x += cols[i];
            });
            Y += 18;
            // Rows
            offer.items.forEach((item, idx) => {
                const bg = idx % 2 === 0 ? '#fff' : '#f8fafc';
                doc.rect(tX, Y, tW, 16).fill(bg).stroke('#e2e8f0');
                const d = Number(item.discount);
                const row = [
                    String(idx + 1),
                    txt(item.name).slice(0, 28),
                    String(Number(item.quantity)),
                    item.unit,
                    money(item.unitPrice, ''),
                    Number(item.vatRate) + '%',
                    d > 0 ? d + '%' : '-',
                    money(item.totalNet, '')
                ];
                x = tX;
                doc.font('Helvetica').fontSize(7).fillColor('#1e293b');
                row.forEach((v, i) => {
                    doc.text(v, x + 2, Y + 4, { width: cols[i] - 4, align: i === 1 ? 'left' : 'center' });
                    x += cols[i];
                });
                Y += 16;
            });
            Y += 12;
            // === SUMMARY ===
            const sumX = L + W - 180;
            doc.font('Helvetica').fontSize(9).fillColor('#1e293b').text('Netto:', sumX, Y);
            doc.font('Helvetica-Bold').text(money(offer.totalNet, offer.currency), sumX + 60, Y, { width: 120, align: 'right' });
            Y += 14;
            doc.font('Helvetica').text('VAT:', sumX, Y);
            doc.font('Helvetica-Bold').text(money(offer.totalVat, offer.currency), sumX + 60, Y, { width: 120, align: 'right' });
            Y += 18;
            doc.rect(sumX, Y, 180, 22).fill('#0891b2');
            doc.font('Helvetica-Bold').fontSize(10).fillColor('#fff').text('BRUTTO:', sumX + 8, Y + 6);
            doc.text(money(offer.totalGross, offer.currency), sumX + 60, Y + 6, { width: 112, align: 'right' });
            Y += 35;
            // === TERMS ===
            if (offer.terms) {
                doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b').text('Warunki:', L, Y);
                Y += 12;
                doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(txt(offer.terms), L, Y, { width: W });
                Y += 25;
            }
            // === SIGNATURE ===
            doc.moveTo(380, Y + 20).lineTo(555, Y + 20).stroke('#cbd5e1');
            doc.font('Helvetica').fontSize(7).fillColor('#94a3b8').text('Podpis i pieczec', 380, Y + 24, { width: 175, align: 'center' });
            const targetY = 720;
            if (Y < targetY)
                Y = targetY;
            // === FOOTER ===
            doc.moveTo(L, Y + 20).lineTo(L + W, Y + 20).stroke('#e2e8f0');
            doc.font('Helvetica').fontSize(7).fillColor('#94a3b8')
                .text('Wygenerowano w SmartQuote AI | ' + date(new Date()), L, Y + 25, { width: W, align: 'center' });
            doc.end();
        });
    }
    generateContractPDF(contract) {
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
            // === HEADER ===
            doc.rect(0, 0, 595, 45).fill('#059669'); // Zielony dla umów
            doc.font('Helvetica-Bold').fontSize(18).fillColor('#fff').text('SmartQuote', L, 14);
            const company = txt(contract.user.company || contract.user.name || '');
            doc.font('Helvetica').fontSize(8).text(company, 350, 10, { width: 200, align: 'right' });
            if (contract.user.email)
                doc.text(contract.user.email, 350, 20, { width: 200, align: 'right' });
            if (contract.user.phone)
                doc.text(contract.user.phone, 350, 30, { width: 200, align: 'right' });
            Y = 55;
            // === TITLE ===
            doc.font('Helvetica-Bold').fontSize(16).fillColor('#1e293b').text('UMOWA', L, Y);
            doc.font('Helvetica').fontSize(10).fillColor('#059669').text('Nr: ' + contract.number, L + 80, Y + 2);
            Y += 28;
            // === PARTIES ===
            const boxW = 248;
            const boxH = 80;
            // Seller / Wykonawca
            doc.rect(L, Y, boxW, boxH).fill('#f1f5f9');
            doc.rect(L, Y, boxW, 16).fill('#059669');
            doc.font('Helvetica-Bold').fontSize(8).fillColor('#fff').text('WYKONAWCA', L + 8, Y + 4);
            doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b').text(company, L + 8, Y + 22);
            doc.font('Helvetica').fontSize(8);
            let sY = Y + 34;
            if (contract.user.email) {
                doc.text(contract.user.email, L + 8, sY);
                sY += 10;
            }
            if (contract.user.phone) {
                doc.text(contract.user.phone, L + 8, sY);
            }
            // Buyer / Zleceniodawca
            const bX = L + boxW + 19;
            doc.rect(bX, Y, boxW, boxH).fill('#f1f5f9');
            doc.rect(bX, Y, boxW, 16).fill('#059669');
            doc.font('Helvetica-Bold').fontSize(8).fillColor('#fff').text('ZLECENIODAWCA', bX + 8, Y + 4);
            const client = txt(contract.client.type === 'COMPANY' ? (contract.client.company || contract.client.name) : contract.client.name);
            doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b').text(client, bX + 8, Y + 22);
            doc.font('Helvetica').fontSize(8);
            let cY = Y + 34;
            if (contract.client.nip) {
                doc.text('NIP: ' + contract.client.nip, bX + 8, cY);
                cY += 10;
            }
            if (contract.client.address) {
                doc.text(txt(contract.client.address), bX + 8, cY);
                cY += 10;
            }
            if (contract.client.city) {
                doc.text(txt((contract.client.postalCode || '') + ' ' + (contract.client.city || '')), bX + 8, cY);
                cY += 10;
            }
            if (contract.client.email) {
                doc.text(contract.client.email, bX + 8, cY);
            }
            Y += boxH + 10;
            // === INFO BAR ===
            doc.rect(L, Y, W, 26).fill('#f1f5f9');
            const infos = [
                ['Data zawarcia', date(contract.createdAt)],
                ['Obowiazuje od', date(contract.startDate)],
                ['Obowiazuje do', date(contract.endDate)],
                ['Status', contractStatusMap[contract.status] || contract.status]
            ];
            const iW = W / 4;
            infos.forEach(([lbl, val], i) => {
                const x = L + i * iW + 6;
                doc.font('Helvetica').fontSize(7).fillColor('#64748b').text(lbl, x, Y + 4);
                doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b').text(val, x, Y + 13);
            });
            Y += 32;
            // === CONTRACT TITLE & DESC ===
            if (contract.title) {
                doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e293b').text(txt(contract.title), L, Y);
                Y += 15;
            }
            if (contract.description) {
                doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(txt(contract.description), L, Y, { width: W });
                Y += 15;
            }
            // === TABLE ===
            const cols = [22, 175, 40, 30, 58, 35, 35, 70];
            const headers = ['Lp', 'Nazwa', 'Ilosc', 'Jm', 'Cena', 'VAT', 'Rabat', 'Netto'];
            const tW = cols.reduce((a, b) => a + b, 0);
            const tX = L + (W - tW) / 2;
            // Header
            doc.rect(tX, Y, tW, 18).fill('#059669');
            let x = tX;
            doc.font('Helvetica-Bold').fontSize(7).fillColor('#fff');
            headers.forEach((h, i) => {
                doc.text(h, x + 2, Y + 5, { width: cols[i] - 4, align: 'center' });
                x += cols[i];
            });
            Y += 18;
            // Rows
            contract.items.forEach((item, idx) => {
                const bg = idx % 2 === 0 ? '#fff' : '#f8fafc';
                doc.rect(tX, Y, tW, 16).fill(bg).stroke('#e2e8f0');
                const d = Number(item.discount);
                const row = [
                    String(idx + 1),
                    txt(item.name).slice(0, 28),
                    String(Number(item.quantity)),
                    item.unit,
                    money(item.unitPrice, ''),
                    Number(item.vatRate) + '%',
                    d > 0 ? d + '%' : '-',
                    money(item.totalNet, '')
                ];
                x = tX;
                doc.font('Helvetica').fontSize(7).fillColor('#1e293b');
                row.forEach((v, i) => {
                    doc.text(v, x + 2, Y + 4, { width: cols[i] - 4, align: i === 1 ? 'left' : 'center' });
                    x += cols[i];
                });
                Y += 16;
            });
            Y += 12;
            // === SUMMARY ===
            const sumX = L + W - 180;
            doc.font('Helvetica').fontSize(9).fillColor('#1e293b').text('Netto:', sumX, Y);
            doc.font('Helvetica-Bold').text(money(contract.totalNet, contract.currency), sumX + 60, Y, { width: 120, align: 'right' });
            Y += 14;
            doc.font('Helvetica').text('VAT:', sumX, Y);
            doc.font('Helvetica-Bold').text(money(contract.totalVat, contract.currency), sumX + 60, Y, { width: 120, align: 'right' });
            Y += 18;
            doc.rect(sumX, Y, 180, 22).fill('#059669');
            doc.font('Helvetica-Bold').fontSize(10).fillColor('#fff').text('BRUTTO:', sumX + 8, Y + 6);
            doc.text(money(contract.totalGross, contract.currency), sumX + 60, Y + 6, { width: 112, align: 'right' });
            Y += 35;
            // === TERMS ===
            if (contract.terms) {
                doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b').text('Warunki umowy:', L, Y);
                Y += 12;
                doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(txt(contract.terms), L, Y, { width: W });
                Y += 25;
            }
            // === PAYMENT TERMS ===
            if (contract.paymentTerms) {
                doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b').text('Warunki platnosci:', L, Y);
                Y += 12;
                doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(txt(contract.paymentTerms), L, Y, { width: W });
                Y += 25;
            }
            doc.font('Helvetica').fontSize(8).fillColor('#64748b').text('Termin platnosci: ' + contract.paymentDays + ' dni', L, Y);
            Y += 20;
            // === SIGNATURES ===
            doc.moveTo(L, Y + 20).lineTo(L + 175, Y + 20).stroke('#cbd5e1');
            doc.font('Helvetica').fontSize(7).fillColor('#94a3b8').text('Podpis Wykonawcy', L, Y + 24, { width: 175, align: 'center' });
            doc.moveTo(380, Y + 20).lineTo(555, Y + 20).stroke('#cbd5e1');
            doc.font('Helvetica').fontSize(7).fillColor('#94a3b8').text('Podpis Zleceniodawcy', 380, Y + 24, { width: 175, align: 'center' });
            // Dopychamy Y na dół, ale zostawiamy miejsce na stopkę
            const targetY = 720;
            if (Y < targetY)
                Y = targetY;
            // === FOOTER ===
            doc.moveTo(L, Y + 20).lineTo(L + W, Y + 20).stroke('#e2e8f0');
            doc.font('Helvetica').fontSize(7).fillColor('#94a3b8')
                .text('Wygenerowano w SmartQuote AI | ' + date(new Date()), L, Y + 25, { width: W, align: 'center' });
            doc.end();
        });
    }
}
exports.PDFService = PDFService;
exports.pdfService = new PDFService();
