"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contractStatusMap = exports.statusMap = exports.dateTime = exports.date = exports.money = exports.txt = exports.pl = void 0;
exports.groupItemsByVariant = groupItemsByVariant;
exports.renderItemsTable = renderItemsTable;
const library_1 = require("@prisma/client/runtime/library");
const plMap = {
    'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
    'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
};
const pl = (str) => {
    return str.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, c => plMap[c] || c);
};
exports.pl = pl;
const txt = (text) => text ? (0, exports.pl)(text) : '';
exports.txt = txt;
const money = (amount, cur = 'PLN') => {
    const n = typeof amount === 'number' ? amount : Number(amount);
    return n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + cur;
};
exports.money = money;
const date = (d) => {
    if (!d)
        return '-';
    return new Date(d).toLocaleDateString('pl-PL');
};
exports.date = date;
const dateTime = (d) => {
    if (!d)
        return '-';
    const dt = new Date(d);
    return dt.toLocaleDateString('pl-PL') + ' ' + dt.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};
exports.dateTime = dateTime;
exports.statusMap = {
    DRAFT: 'Szkic', SENT: 'Wysłana', VIEWED: 'Wyświetlona', NEGOTIATION: 'Negocjacje',
    ACCEPTED: 'Zaakceptowana', REJECTED: 'Odrzucona', EXPIRED: 'Wygasła'
};
exports.contractStatusMap = {
    DRAFT: 'Szkic', PENDING_SIGNATURE: 'Do podpisu', ACTIVE: 'Aktywna',
    COMPLETED: 'Zakończona', TERMINATED: 'Rozwiązana', EXPIRED: 'Wygasła'
};
function groupItemsByVariant(items) {
    const hasVariants = items.some(item => item.variantName);
    if (!hasVariants) {
        return [{
                name: null,
                items,
                totalNet: items.reduce((s, i) => s.plus(i.totalNet), new library_1.Decimal(0)),
                totalVat: items.reduce((s, i) => s.plus(i.totalVat), new library_1.Decimal(0)),
                totalGross: items.reduce((s, i) => s.plus(i.totalGross), new library_1.Decimal(0)),
            }];
    }
    const groups = [];
    const baseItems = items.filter(i => !i.variantName);
    if (baseItems.length > 0) {
        groups.push({
            name: null,
            items: baseItems,
            totalNet: baseItems.reduce((s, i) => s.plus(i.totalNet), new library_1.Decimal(0)),
            totalVat: baseItems.reduce((s, i) => s.plus(i.totalVat), new library_1.Decimal(0)),
            totalGross: baseItems.reduce((s, i) => s.plus(i.totalGross), new library_1.Decimal(0)),
        });
    }
    const variantNames = [...new Set(items.filter(i => i.variantName).map(i => i.variantName))];
    for (const vName of variantNames) {
        const vItems = items.filter(i => i.variantName === vName);
        groups.push({
            name: vName,
            items: vItems,
            totalNet: vItems.reduce((s, i) => s.plus(i.totalNet), new library_1.Decimal(0)),
            totalVat: vItems.reduce((s, i) => s.plus(i.totalVat), new library_1.Decimal(0)),
            totalGross: vItems.reduce((s, i) => s.plus(i.totalGross), new library_1.Decimal(0)),
        });
    }
    return groups;
}
function renderItemsTable(doc, items, startY, accentColor, W, L) {
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
            (0, exports.txt)(item.name).slice(0, 28),
            String(quantity),
            item.unit,
            (0, exports.money)(unitPrice, ''),
            vatRate + '%',
            discount > 0 ? discount + '%' : '-',
            (0, exports.money)(totalNet, '')
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
