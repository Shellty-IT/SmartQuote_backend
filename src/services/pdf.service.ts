// smartquote_backend/src/services/pdf.service.ts

import PDFDocument from 'pdfkit';
import { Decimal } from '@prisma/client/runtime/library';

interface PDFClient {
    id: string;
    type: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    nip: string | null;
    address: string | null;
    city: string | null;
    postalCode: string | null;
}

interface PDFOfferItem {
    id: string;
    name: string;
    description: string | null;
    quantity: Decimal;
    unit: string;
    unitPrice: Decimal;
    vatRate: Decimal;
    discount: Decimal;
    totalNet: Decimal;
    totalVat: Decimal;
    totalGross: Decimal;
    variantName: string | null;
}

interface PDFContractItem {
    id: string;
    name: string;
    description: string | null;
    quantity: Decimal;
    unit: string;
    unitPrice: Decimal;
    vatRate: Decimal;
    discount: Decimal;
    totalNet: Decimal;
    totalVat: Decimal;
    totalGross: Decimal;
}

interface PDFUser {
    id: string;
    email: string;
    name: string | null;
    company: string | null;
    phone: string | null;
}

interface PDFAcceptanceLog {
    ipAddress: string;
    userAgent: string;
    acceptedAt: Date;
    contentHash: string;
    clientName: string | null;
    clientEmail: string | null;
    selectedVariant: string | null;
    totalNet: Decimal;
    totalVat: Decimal;
    totalGross: Decimal;
    currency: string;
}

interface PDFOffer {
    id: string;
    number: string;
    title: string;
    description: string | null;
    status: string;
    totalNet: Decimal;
    totalVat: Decimal;
    totalGross: Decimal;
    currency: string;
    validUntil: Date | null;
    notes: string | null;
    terms: string | null;
    paymentDays: number;
    createdAt: Date;
    client: PDFClient;
    items: PDFOfferItem[];
    user: PDFUser;
    acceptanceLog?: PDFAcceptanceLog | null;
}

interface PDFContract {
    id: string;
    number: string;
    title: string;
    description: string | null;
    status: string;
    totalNet: Decimal;
    totalVat: Decimal;
    totalGross: Decimal;
    currency: string;
    startDate: Date | null;
    endDate: Date | null;
    signedAt: Date | null;
    terms: string | null;
    paymentTerms: string | null;
    paymentDays: number;
    notes: string | null;
    createdAt: Date;
    client: PDFClient;
    items: PDFContractItem[];
    user: PDFUser;
}

interface VariantGroup {
    name: string | null;
    items: PDFOfferItem[];
    totalNet: Decimal;
    totalVat: Decimal;
    totalGross: Decimal;
}

const pl = (str: string): string => {
    const map: Record<string, string> = {
        'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
        'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
    };
    return str.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, c => map[c] || c);
};

const txt = (text: string | null | undefined): string => text ? pl(text) : '';

const money = (amount: Decimal | number, cur = 'PLN'): string => {
    const n = typeof amount === 'number' ? amount : Number(amount);
    return n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + cur;
};

const date = (d: Date | string | null): string => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('pl-PL');
};

const dateTime = (d: Date | string | null): string => {
    if (!d) return '-';
    const dt = new Date(d);
    return dt.toLocaleDateString('pl-PL') + ' ' + dt.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const statusMap: Record<string, string> = {
    DRAFT: 'Szkic', SENT: 'Wyslana', VIEWED: 'Wyswietlona', NEGOTIATION: 'Negocjacje',
    ACCEPTED: 'Zaakceptowana', REJECTED: 'Odrzucona', EXPIRED: 'Wygasla'
};

const contractStatusMap: Record<string, string> = {
    DRAFT: 'Szkic', PENDING_SIGNATURE: 'Do podpisu', ACTIVE: 'Aktywna',
    COMPLETED: 'Zakonczona', TERMINATED: 'Rozwiazana', EXPIRED: 'Wygasla'
};

function groupItemsByVariant(items: PDFOfferItem[]): VariantGroup[] {
    const hasVariants = items.some((item) => item.variantName);
    if (!hasVariants) {
        return [{
            name: null,
            items,
            totalNet: items.reduce((s, i) => s.plus(i.totalNet), new Decimal(0)),
            totalVat: items.reduce((s, i) => s.plus(i.totalVat), new Decimal(0)),
            totalGross: items.reduce((s, i) => s.plus(i.totalGross), new Decimal(0)),
        }];
    }

    const groups: VariantGroup[] = [];

    const baseItems = items.filter((i) => !i.variantName);
    if (baseItems.length > 0) {
        groups.push({
            name: null,
            items: baseItems,
            totalNet: baseItems.reduce((s, i) => s.plus(i.totalNet), new Decimal(0)),
            totalVat: baseItems.reduce((s, i) => s.plus(i.totalVat), new Decimal(0)),
            totalGross: baseItems.reduce((s, i) => s.plus(i.totalGross), new Decimal(0)),
        });
    }

    const variantNames = [...new Set(items.filter((i) => i.variantName).map((i) => i.variantName!))];
    for (const vName of variantNames) {
        const vItems = items.filter((i) => i.variantName === vName);
        groups.push({
            name: vName,
            items: vItems,
            totalNet: vItems.reduce((s, i) => s.plus(i.totalNet), new Decimal(0)),
            totalVat: vItems.reduce((s, i) => s.plus(i.totalVat), new Decimal(0)),
            totalGross: vItems.reduce((s, i) => s.plus(i.totalGross), new Decimal(0)),
        });
    }

    return groups;
}

export class PDFService {
    private renderItemsTable(
        doc: PDFKit.PDFDocument,
        items: PDFOfferItem[] | PDFContractItem[],
        startY: number,
        accentColor: string,
        W: number,
        L: number
    ): number {
        let Y = startY;
        const cols = [22, 175, 40, 30, 58, 35, 35, 70];
        const headers = ['Lp', 'Nazwa', 'Ilosc', 'Jm', 'Cena', 'VAT', 'Rabat', 'Netto'];
        const tW = cols.reduce((a, b) => a + b, 0);
        const tX = L + (W - tW) / 2;

        doc.rect(tX, Y, tW, 18).fill(accentColor);
        let x = tX;
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#fff');
        headers.forEach((h, i) => {
            doc.text(h, x + 2, Y + 5, { width: cols[i] - 4, align: 'center' });
            x += cols[i];
        });
        Y += 18;

        items.forEach((item, idx) => {
            if (Y > 700) {
                doc.addPage();
                Y = 40;
            }

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

        return Y;
    }

    private renderAuditTrailPage(
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
        doc.font('Helvetica-Bold').fontSize(16).fillColor('#fff')
            .text('CERTIFICATE OF ACCEPTANCE', L, 10);
        doc.font('Helvetica').fontSize(9).fillColor('#d1fae5')
            .text('Formalne potwierdzenie akceptacji oferty', L, 30);

        doc.font('Helvetica').fontSize(8).fillColor('#fff')
            .text('SmartQuote AI', 400, 10, { width: 155, align: 'right' });
        doc.text(dateTime(log.acceptedAt), 400, 22, { width: 155, align: 'right' });

        Y = 65;

        doc.rect(L, Y, W, 55).fill(ACCENT_LIGHT).stroke('#a7f3d0');
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#065f46')
            .text('Oferta zaakceptowana', L + 15, Y + 8);
        doc.font('Helvetica').fontSize(9).fillColor('#047857')
            .text(txt(offer.title), L + 15, Y + 22);
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#065f46')
            .text('Nr: ' + offer.number, L + 15, Y + 36);
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#065f46')
            .text(money(log.totalGross, log.currency), 350, Y + 18, { width: W - 350 + L - 15, align: 'right' });

        Y += 70;

        const colW = (W - 15) / 2;

        doc.rect(L, Y, colW, 16).fill(ACCENT);
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#fff').text('AKCEPTUJACY', L + 8, Y + 4);

        doc.rect(L, Y + 16, colW, 50).fill('#f8fafc').stroke('#e2e8f0');
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b')
            .text(txt(log.clientName || '-'), L + 8, Y + 22);
        doc.font('Helvetica').fontSize(8).fillColor('#64748b')
            .text(log.clientEmail || '-', L + 8, Y + 34);

        const rX = L + colW + 15;
        doc.rect(rX, Y, colW, 16).fill(ACCENT);
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#fff').text('SPRZEDAWCA', rX + 8, Y + 4);

        doc.rect(rX, Y + 16, colW, 50).fill('#f8fafc').stroke('#e2e8f0');
        const seller = txt(offer.user.company || offer.user.name || '');
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b')
            .text(seller, rX + 8, Y + 22);
        doc.font('Helvetica').fontSize(8).fillColor('#64748b')
            .text(offer.user.email, rX + 8, Y + 34);

        Y += 80;

        doc.rect(L, Y, W, 16).fill('#0f172a');
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#fff')
            .text('SZCZEGOLY AKCEPTACJI', L + 8, Y + 4);
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
            ['Klient (nabywca)', txt(offer.client.type === 'COMPANY' ? (offer.client.company || offer.client.name) : offer.client.name)],
        );

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
            .text(
                'Hash SHA-256 wygenerowany z zawartosci oferty (pozycje, ceny, wariant, waluta). ' +
                'Sluzy do weryfikacji integralnosci danych w momencie akceptacji.',
                L, Y + 4, { width: W }
            );
        Y += 28;

        doc.rect(L, Y, W, 45).fill(ACCENT_LIGHT).stroke('#a7f3d0');
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#065f46')
            .text('Oswiadczenie', L + 10, Y + 6);
        doc.font('Helvetica').fontSize(7).fillColor('#047857')
            .text(
                'Niniejszy certyfikat potwierdza, ze osoba wskazana powyzej zaakceptowala oferte ' +
                'nr ' + offer.number + ' w dniu ' + dateTime(log.acceptedAt) + '. ' +
                'Dane zostaly zarejestrowane automatycznie przez system SmartQuote AI i sa niemodyfikowalne. ' +
                'Hash SHA-256 umozliwia weryfikacje integralnosci tresci oferty w momencie akceptacji.',
                L + 10, Y + 18, { width: W - 20 }
            );

        Y += 55;

        doc.moveTo(L, Y + 10).lineTo(L + W, Y + 10).stroke('#e2e8f0');
        doc.font('Helvetica').fontSize(7).fillColor('#94a3b8')
            .text(
                'Certificate of Acceptance | SmartQuote AI | Wygenerowano: ' + dateTime(new Date()),
                L, Y + 15, { width: W, align: 'center' }
            );
    }

    generateOfferPDF(offer: PDFOffer): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];

            const doc = new PDFDocument({
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

            doc.rect(0, 0, 595, 45).fill(ACCENT);
            doc.font('Helvetica-Bold').fontSize(18).fillColor('#fff').text('SmartQuote', L, 14);

            const company = txt(offer.user.company || offer.user.name || '');
            doc.font('Helvetica').fontSize(8).text(company, 350, 10, { width: 200, align: 'right' });
            if (offer.user.email) doc.text(offer.user.email, 350, 20, { width: 200, align: 'right' });
            if (offer.user.phone) doc.text(offer.user.phone, 350, 30, { width: 200, align: 'right' });

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
            if (offer.user.email) { doc.text(offer.user.email, L + 8, sY); sY += 10; }
            if (offer.user.phone) { doc.text(offer.user.phone, L + 8, sY); }

            const bX = L + boxW + 19;
            doc.rect(bX, Y, boxW, boxH).fill('#f1f5f9');
            doc.rect(bX, Y, boxW, 16).fill(ACCENT);
            doc.font('Helvetica-Bold').fontSize(8).fillColor('#fff').text('NABYWCA', bX + 8, Y + 4);

            const client = txt(offer.client.type === 'COMPANY' ? (offer.client.company || offer.client.name) : offer.client.name);
            doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b').text(client, bX + 8, Y + 22);
            doc.font('Helvetica').fontSize(8);
            let cY = Y + 34;
            if (offer.client.nip) { doc.text('NIP: ' + offer.client.nip, bX + 8, cY); cY += 10; }
            if (offer.client.email) { doc.text(offer.client.email, bX + 8, cY); cY += 10; }

            Y += boxH + 10;

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

            if (offer.title) {
                doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e293b').text(txt(offer.title), L, Y);
                Y += 15;
            }
            if (offer.description) {
                doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(txt(offer.description), L, Y, { width: W });
                Y += 15;
            }

            const variantGroups = groupItemsByVariant(offer.items);
            const hasVariants = variantGroups.some((g) => g.name !== null);

            for (const group of variantGroups) {
                if (Y > 650) {
                    doc.addPage();
                    Y = 40;
                }

                if (hasVariants) {
                    const label = group.name
                        ? 'Wariant: ' + txt(group.name)
                        : 'Pozycje wspolne';

                    doc.rect(L, Y, W, 20).fill(group.name ? '#ecfeff' : '#f1f5f9');
                    doc.font('Helvetica-Bold').fontSize(9).fillColor(group.name ? '#0891b2' : '#475569')
                        .text(label, L + 8, Y + 5);
                    Y += 24;
                }

                Y = this.renderItemsTable(doc, group.items, Y, ACCENT, W, L);

                if (hasVariants) {
                    const subX = L + W - 160;
                    Y += 4;
                    doc.font('Helvetica').fontSize(8).fillColor('#64748b')
                        .text('Netto sekcji:', subX, Y);
                    doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e293b')
                        .text(money(group.totalNet, offer.currency), subX + 70, Y, { width: 90, align: 'right' });
                    Y += 12;
                    doc.font('Helvetica').fontSize(8).fillColor('#64748b')
                        .text('Brutto sekcji:', subX, Y);
                    doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e293b')
                        .text(money(group.totalGross, offer.currency), subX + 70, Y, { width: 90, align: 'right' });
                    Y += 16;
                }

                Y += 8;
            }

            Y += 4;

            const sumX = L + W - 180;
            doc.font('Helvetica').fontSize(9).fillColor('#1e293b').text('Netto:', sumX, Y);
            doc.font('Helvetica-Bold').text(money(offer.totalNet, offer.currency), sumX + 60, Y, { width: 120, align: 'right' });
            Y += 14;

            doc.font('Helvetica').text('VAT:', sumX, Y);
            doc.font('Helvetica-Bold').text(money(offer.totalVat, offer.currency), sumX + 60, Y, { width: 120, align: 'right' });
            Y += 18;

            doc.rect(sumX, Y, 180, 22).fill(ACCENT);
            doc.font('Helvetica-Bold').fontSize(10).fillColor('#fff').text('BRUTTO:', sumX + 8, Y + 6);
            doc.text(money(offer.totalGross, offer.currency), sumX + 60, Y + 6, { width: 112, align: 'right' });
            Y += 35;

            if (hasVariants) {
                doc.font('Helvetica').fontSize(7).fillColor('#94a3b8')
                    .text(txt('* Kwota brutto dotyczy pozycji wspolnych + pierwszego wariantu'), L, Y);
                Y += 15;
            }

            if (offer.terms) {
                if (Y > 680) { doc.addPage(); Y = 40; }
                doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b').text('Warunki:', L, Y);
                Y += 12;
                doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(txt(offer.terms), L, Y, { width: W });
                Y += 25;
            }

            doc.moveTo(380, Y + 20).lineTo(555, Y + 20).stroke('#cbd5e1');
            doc.font('Helvetica').fontSize(7).fillColor('#94a3b8').text('Podpis i pieczec', 380, Y + 24, { width: 175, align: 'center' });

            const targetY = 720;
            if (Y < targetY) Y = targetY;

            doc.moveTo(L, Y + 20).lineTo(L + W, Y + 20).stroke('#e2e8f0');
            doc.font('Helvetica').fontSize(7).fillColor('#94a3b8')
                .text('Wygenerowano w SmartQuote AI | ' + date(new Date()), L, Y + 25, { width: W, align: 'center' });

            if (offer.acceptanceLog) {
                this.renderAuditTrailPage(doc, offer, offer.acceptanceLog);
            }

            doc.end();
        });
    }

    generateContractPDF(contract: PDFContract): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];

            const doc = new PDFDocument({
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

            const company = txt(contract.user.company || contract.user.name || '');
            doc.font('Helvetica').fontSize(8).text(company, 350, 10, { width: 200, align: 'right' });
            if (contract.user.email) doc.text(contract.user.email, 350, 20, { width: 200, align: 'right' });
            if (contract.user.phone) doc.text(contract.user.phone, 350, 30, { width: 200, align: 'right' });

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
            if (contract.user.email) { doc.text(contract.user.email, L + 8, csY); csY += 10; }
            if (contract.user.phone) { doc.text(contract.user.phone, L + 8, csY); }

            const cbX = L + boxW + 19;
            doc.rect(cbX, Y, boxW, boxH).fill('#f1f5f9');
            doc.rect(cbX, Y, boxW, 16).fill(ACCENT);
            doc.font('Helvetica-Bold').fontSize(8).fillColor('#fff').text('ZLECENIODAWCA', cbX + 8, Y + 4);

            const cclient = txt(contract.client.type === 'COMPANY' ? (contract.client.company || contract.client.name) : contract.client.name);
            doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b').text(cclient, cbX + 8, Y + 22);
            doc.font('Helvetica').fontSize(8);
            let ccY = Y + 34;
            if (contract.client.nip) { doc.text('NIP: ' + contract.client.nip, cbX + 8, ccY); ccY += 10; }
            if (contract.client.address) { doc.text(txt(contract.client.address), cbX + 8, ccY); ccY += 10; }
            if (contract.client.city) { doc.text(txt((contract.client.postalCode || '') + ' ' + (contract.client.city || '')), cbX + 8, ccY); ccY += 10; }
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
                doc.font('Helvetica').fontSize(7).fillColor('#64748b').text(lbl, x, Y + 4);
                doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b').text(val, x, Y + 13);
            });
            Y += 32;

            if (contract.title) {
                doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e293b').text(txt(contract.title), L, Y);
                Y += 15;
            }
            if (contract.description) {
                doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(txt(contract.description), L, Y, { width: W });
                Y += 15;
            }

            Y = this.renderItemsTable(doc, contract.items, Y, ACCENT, W, L);
            Y += 12;

            const csumX = L + W - 180;
            doc.font('Helvetica').fontSize(9).fillColor('#1e293b').text('Netto:', csumX, Y);
            doc.font('Helvetica-Bold').text(money(contract.totalNet, contract.currency), csumX + 60, Y, { width: 120, align: 'right' });
            Y += 14;

            doc.font('Helvetica').text('VAT:', csumX, Y);
            doc.font('Helvetica-Bold').text(money(contract.totalVat, contract.currency), csumX + 60, Y, { width: 120, align: 'right' });
            Y += 18;

            doc.rect(csumX, Y, 180, 22).fill(ACCENT);
            doc.font('Helvetica-Bold').fontSize(10).fillColor('#fff').text('BRUTTO:', csumX + 8, Y + 6);
            doc.text(money(contract.totalGross, contract.currency), csumX + 60, Y + 6, { width: 112, align: 'right' });
            Y += 35;

            if (contract.terms) {
                if (Y > 680) { doc.addPage(); Y = 40; }
                doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b').text('Warunki umowy:', L, Y);
                Y += 12;
                doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(txt(contract.terms), L, Y, { width: W });
                Y += 25;
            }

            if (contract.paymentTerms) {
                if (Y > 680) { doc.addPage(); Y = 40; }
                doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b').text('Warunki platnosci:', L, Y);
                Y += 12;
                doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(txt(contract.paymentTerms), L, Y, { width: W });
                Y += 25;
            }

            doc.font('Helvetica').fontSize(8).fillColor('#64748b').text('Termin platnosci: ' + contract.paymentDays + ' dni', L, Y);
            Y += 20;

            doc.moveTo(L, Y + 20).lineTo(L + 175, Y + 20).stroke('#cbd5e1');
            doc.font('Helvetica').fontSize(7).fillColor('#94a3b8').text('Podpis Wykonawcy', L, Y + 24, { width: 175, align: 'center' });

            doc.moveTo(380, Y + 20).lineTo(555, Y + 20).stroke('#cbd5e1');
            doc.font('Helvetica').fontSize(7).fillColor('#94a3b8').text('Podpis Zleceniodawcy', 380, Y + 24, { width: 175, align: 'center' });

            const ctargetY = 720;
            if (Y < ctargetY) Y = ctargetY;

            doc.moveTo(L, Y + 20).lineTo(L + W, Y + 20).stroke('#e2e8f0');
            doc.font('Helvetica').fontSize(7).fillColor('#94a3b8')
                .text('Wygenerowano w SmartQuote AI | ' + date(new Date()), L, Y + 25, { width: W, align: 'center' });

            doc.end();
        });
    }
}

export const pdfService = new PDFService();