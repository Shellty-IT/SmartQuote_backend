// smartquote_backend/src/services/pdf/helpers.ts
import PDFDocument from 'pdfkit';
import { Decimal } from '@prisma/client/runtime/library';

interface TableItem {
    name: string;
    quantity: Decimal | number;
    unit: string;
    unitPrice: Decimal | number;
    vatRate: Decimal | number;
    discount: Decimal | number;
    totalNet: Decimal | number;
    totalVat: Decimal | number;
    totalGross: Decimal | number;
    variantName?: string | null;
}

const plMap: Record<string, string> = {
    'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
    'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
};

export const pl = (str: string): string => {
    return str.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, c => plMap[c] || c);
};

export const txt = (text: string | null | undefined): string => text ? pl(text) : '';

export const money = (amount: Decimal | number, cur = 'PLN'): string => {
    const n = typeof amount === 'number' ? amount : Number(amount);
    return n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + cur;
};

export const date = (d: Date | string | null): string => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('pl-PL');
};

export const dateTime = (d: Date | string | null): string => {
    if (!d) return '-';
    const dt = new Date(d);
    return dt.toLocaleDateString('pl-PL') + ' ' + dt.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export const statusMap: Record<string, string> = {
    DRAFT: 'Szkic', SENT: 'Wysłana', VIEWED: 'Wyświetlona', NEGOTIATION: 'Negocjacje',
    ACCEPTED: 'Zaakceptowana', REJECTED: 'Odrzucona', EXPIRED: 'Wygasła'
};

export const contractStatusMap: Record<string, string> = {
    DRAFT: 'Szkic', PENDING_SIGNATURE: 'Do podpisu', ACTIVE: 'Aktywna',
    COMPLETED: 'Zakończona', TERMINATED: 'Rozwiązana', EXPIRED: 'Wygasła'
};

export function groupItemsByVariant(items: TableItem[]): Array<{
    name: string | null;
    items: TableItem[];
    totalNet: Decimal;
    totalVat: Decimal;
    totalGross: Decimal;
}> {
    const hasVariants = items.some(item => item.variantName);
    if (!hasVariants) {
        return [{
            name: null,
            items,
            totalNet: items.reduce((s, i) => s.plus(i.totalNet), new Decimal(0)),
            totalVat: items.reduce((s, i) => s.plus(i.totalVat), new Decimal(0)),
            totalGross: items.reduce((s, i) => s.plus(i.totalGross), new Decimal(0)),
        }];
    }

    const groups: ReturnType<typeof groupItemsByVariant> = [];

    const baseItems = items.filter(i => !i.variantName);
    if (baseItems.length > 0) {
        groups.push({
            name: null,
            items: baseItems,
            totalNet: baseItems.reduce((s, i) => s.plus(i.totalNet), new Decimal(0)),
            totalVat: baseItems.reduce((s, i) => s.plus(i.totalVat), new Decimal(0)),
            totalGross: baseItems.reduce((s, i) => s.plus(i.totalGross), new Decimal(0)),
        });
    }

    const variantNames = [...new Set(items.filter(i => i.variantName).map(i => i.variantName!))];
    for (const vName of variantNames) {
        const vItems = items.filter(i => i.variantName === vName);
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

export function renderItemsTable(
    doc: PDFKit.PDFDocument,
    items: TableItem[],
    startY: number,
    accentColor: string,
    W: number,
    L: number
): number {
    let Y = startY;
    const cols = [22, 175, 40, 30, 58, 35, 35, 70];
    const headers = ['Lp', 'Nazwa', 'Ilość', 'Jm', 'Cena', 'VAT', 'Rabat', 'Netto'];
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

        const quantity = typeof item.quantity === 'number' ? item.quantity : Number(item.quantity);
        const unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : Number(item.unitPrice);
        const totalNet = typeof item.totalNet === 'number' ? item.totalNet : Number(item.totalNet);
        const vatRate = typeof item.vatRate === 'number' ? item.vatRate : Number(item.vatRate);
        const discount = typeof item.discount === 'number' ? item.discount : Number(item.discount);

        const row = [
            String(idx + 1),
            txt(item.name).slice(0, 28),
            String(quantity),
            item.unit,
            money(unitPrice, ''),
            vatRate + '%',
            discount > 0 ? discount + '%' : '-',
            money(totalNet, '')
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