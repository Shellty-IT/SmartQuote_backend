// src/services/pdf/offer-pdf-renderer.ts
import { PDFOffer, PDFAcceptanceLog } from './types';
import { createDoc, txt, money, date, dateTime, statusMap, groupItemsByVariant, renderItemsTable, tryRenderLogo } from './helpers';
import { PDF_CONFIG } from './pdf-config';
import { createModuleLogger } from '../../lib/logger';

const logger = createModuleLogger('offer-pdf-renderer');

export class OfferPDFRenderer {
    private readonly config = PDF_CONFIG;

    async render(offer: PDFOffer): Promise<Buffer> {
        logger.info({ offerId: offer.id, offerNumber: offer.number }, 'Starting PDF rendering');

        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            const doc = createDoc();

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => {
                logger.info({ offerId: offer.id, size: chunks.length }, 'PDF rendering completed');
                resolve(Buffer.concat(chunks));
            });
            doc.on('error', (err) => {
                logger.error({ err, offerId: offer.id }, 'PDF rendering failed');
                reject(err);
            });

            try {
                let Y = 40;

                Y = this.renderHeader(doc, offer, Y);
                Y = this.renderTitle(doc, offer, Y);
                Y = this.renderParties(doc, offer, Y);
                Y = this.renderMetadata(doc, offer, Y);
                Y = this.renderDescription(doc, offer, Y);
                Y = this.renderItems(doc, offer, Y);
                Y = this.renderSummary(doc, offer, Y);
                Y = this.renderTerms(doc, offer, Y);
                Y = this.renderSignature(doc, Y);
                this.renderFooter(doc, Y);

                if (offer.acceptanceLog) {
                    this.renderAuditTrailPage(doc, offer, offer.acceptanceLog);
                }

                doc.end();
            } catch (err) {
                logger.error({ err, offerId: offer.id }, 'Error during PDF rendering');
                reject(err);
            }
        });
    }

    private renderHeader(doc: PDFKit.PDFDocument, offer: PDFOffer, Y: number): number {
        const { colors, layout } = this.config;

        doc.rect(0, 0, layout.pageWidth, layout.headerHeight).fill(colors.primary);

        const hasLogo = tryRenderLogo(doc, offer.user.logo, layout.leftMargin, 8, 120, 34);
        if (!hasLogo) {
            doc.font('Bold').fontSize(18).fillColor('#fff').text('SmartQuote', layout.leftMargin, 16);
        }

        this.renderHeaderCompanyInfo(doc, offer);

        return Y;
    }

    private renderHeaderCompanyInfo(doc: PDFKit.PDFDocument, offer: PDFOffer): void {
        const { sizes } = this.config;
        const companyName = txt(offer.user.company || offer.user.name || offer.user.email);
        const headerRightX = 340;
        const headerRightW = 215;

        doc.font('Bold').fontSize(sizes.header).fillColor('#fff').text(companyName, headerRightX, 8, { width: headerRightW, align: 'right' });
        doc.font('Regular').fontSize(sizes.small).fillColor('#e0f2fe');

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
    }

    private renderTitle(doc: PDFKit.PDFDocument, offer: PDFOffer, Y: number): number {
        const { colors, layout, sizes } = this.config;

        Y = 60;

        doc.font('Bold').fontSize(sizes.title).fillColor(colors.text).text('OFERTA HANDLOWA', layout.leftMargin, Y);
        Y += 6;
        doc.font('Regular').fontSize(10).fillColor(colors.primary).text('Nr: ' + offer.number, layout.leftMargin, Y + 16);

        return Y + 34;
    }

    private renderParties(doc: PDFKit.PDFDocument, offer: PDFOffer, Y: number): number {
        const { layout } = this.config;
        const boxW = 248;
        const boxH = 80;

        this.renderSellerBox(doc, offer, layout.leftMargin, Y, boxW, boxH);
        this.renderBuyerBox(doc, offer, layout.leftMargin + boxW + 19, Y, boxW, boxH);

        return Y + boxH + 10;
    }

    private renderSellerBox(doc: PDFKit.PDFDocument, offer: PDFOffer, x: number, y: number, width: number, height: number): void {
        const { colors, sizes } = this.config;
        const companyName = txt(offer.user.company || offer.user.name || offer.user.email);

        doc.rect(x, y, width, height).fill(colors.background);
        doc.rect(x, y, width, 16).fill(colors.primary);
        doc.font('Bold').fontSize(sizes.normal).fillColor('#fff').text('SPRZEDAWCA', x + 8, y + 4);
        doc.font('Bold').fontSize(sizes.header).fillColor(colors.text).text(companyName, x + 8, y + 20);
        doc.font('Regular').fontSize(sizes.small).fillColor(colors.textMuted);

        let sY = y + 32;
        if (offer.user.nip) { doc.text('NIP: ' + offer.user.nip, x + 8, sY); sY += 10; }
        if (offer.user.address) {
            const addrLine = [offer.user.address, offer.user.postalCode, offer.user.city].filter(Boolean).join(', ');
            doc.text(addrLine, x + 8, sY, { width: width - 16 }); sY += 10;
        }
        if (offer.user.email) { doc.text(offer.user.email, x + 8, sY); sY += 10; }
        if (offer.user.phone) { doc.text(offer.user.phone, x + 8, sY); }
    }

    private renderBuyerBox(doc: PDFKit.PDFDocument, offer: PDFOffer, x: number, y: number, width: number, height: number): void {
        const { colors, sizes } = this.config;
        const clientName = txt(offer.client.type === 'COMPANY'
            ? (offer.client.company || offer.client.name)
            : offer.client.name);

        doc.rect(x, y, width, height).fill(colors.background);
        doc.rect(x, y, width, 16).fill(colors.primary);
        doc.font('Bold').fontSize(sizes.normal).fillColor('#fff').text('NABYWCA', x + 8, y + 4);
        doc.font('Bold').fontSize(sizes.header).fillColor(colors.text).text(clientName, x + 8, y + 20);
        doc.font('Regular').fontSize(sizes.small).fillColor(colors.textMuted);

        let cY = y + 32;
        if (offer.client.nip) { doc.text('NIP: ' + offer.client.nip, x + 8, cY); cY += 10; }
        if (offer.client.address) { doc.text(txt(offer.client.address), x + 8, cY); cY += 10; }
        if (offer.client.city) {
            doc.text(txt((offer.client.postalCode || '') + ' ' + offer.client.city), x + 8, cY); cY += 10;
        }
        if (offer.client.email) { doc.text(offer.client.email, x + 8, cY); }
    }

    private renderMetadata(doc: PDFKit.PDFDocument, offer: PDFOffer, Y: number): number {
        const { colors, layout, sizes } = this.config;

        doc.rect(layout.leftMargin, Y, layout.contentWidth, 26).fill(colors.background);

        const infos = [
            ['Data', date(offer.createdAt)],
            ['Ważna do', date(offer.validUntil)],
            ['Status', statusMap[offer.status] || offer.status],
            ['Płatność', offer.paymentDays + ' dni']
        ];

        const iW = layout.contentWidth / 4;
        infos.forEach(([lbl, val], i) => {
            const x = layout.leftMargin + i * iW + 6;
            doc.font('Regular').fontSize(sizes.tiny).fillColor(colors.textLight).text(lbl, x, Y + 4);
            doc.font('Bold').fontSize(sizes.header).fillColor(colors.text).text(val, x, Y + 13);
        });

        return Y + 32;
    }

    private renderDescription(doc: PDFKit.PDFDocument, offer: PDFOffer, Y: number): number {
        const { colors, layout, sizes } = this.config;

        if (offer.title) {
            doc.font('Bold').fontSize(sizes.subtitle).fillColor(colors.text).text(txt(offer.title), layout.leftMargin, Y);
            Y += 16;
        }
        if (offer.description) {
            doc.font('Regular').fontSize(sizes.normal).fillColor(colors.textLight)
                .text(txt(offer.description), layout.leftMargin, Y, { width: layout.contentWidth });
            Y += 20;
        }

        return Y;
    }

    private renderItems(doc: PDFKit.PDFDocument, offer: PDFOffer, Y: number): number {
        const { colors, layout } = this.config;
        const variantGroups = groupItemsByVariant(offer.items);
        const hasVariants = variantGroups.some(g => g.name !== null);

        for (const group of variantGroups) {
            if (Y > 650) { doc.addPage(); Y = 40; }

            if (hasVariants) {
                Y = this.renderVariantHeader(doc, group, Y);
            }

            Y = renderItemsTable(doc, group.items, Y, colors.primary, layout.contentWidth, layout.leftMargin);

            if (hasVariants) {
                Y = this.renderVariantSummary(doc, group, offer.currency, Y);
            }

            Y += 8;
        }

        return Y;
    }

    private renderVariantHeader(doc: PDFKit.PDFDocument, group: any, Y: number): number {
        const { colors, layout, sizes } = this.config;
        const label = group.name ? 'Wariant: ' + txt(group.name) : 'Pozycje wspólne';

        doc.rect(layout.leftMargin, Y, layout.contentWidth, 20).fill(group.name ? '#ecfeff' : colors.background);
        doc.font('Bold').fontSize(sizes.header)
            .fillColor(group.name ? colors.primary : colors.textMuted)
            .text(label, layout.leftMargin + 8, Y + 5);

        return Y + 24;
    }

    private renderVariantSummary(doc: PDFKit.PDFDocument, group: any, currency: string, Y: number): number {
        const { colors, layout, sizes } = this.config;
        const subX = layout.leftMargin + layout.contentWidth - 160;

        Y += 4;
        doc.font('Regular').fontSize(sizes.normal).fillColor(colors.textLight).text('Netto sekcji:', subX, Y);
        doc.font('Bold').fontSize(sizes.normal).fillColor(colors.text)
            .text(money(group.totalNet, currency), subX + 70, Y, { width: 90, align: 'right' });
        Y += 12;
        doc.font('Regular').fontSize(sizes.normal).fillColor(colors.textLight).text('Brutto sekcji:', subX, Y);
        doc.font('Bold').fontSize(sizes.normal).fillColor(colors.text)
            .text(money(group.totalGross, currency), subX + 70, Y, { width: 90, align: 'right' });

        return Y + 16;
    }

    private renderSummary(doc: PDFKit.PDFDocument, offer: PDFOffer, Y: number): number {
        const { colors, layout, sizes } = this.config;
        const sumX = layout.leftMargin + layout.contentWidth - 180;

        Y += 4;
        doc.font('Regular').fontSize(sizes.header).fillColor(colors.text).text('Netto:', sumX, Y);
        doc.font('Bold').text(money(offer.totalNet, offer.currency), sumX + 60, Y, { width: 120, align: 'right' });
        Y += 14;
        doc.font('Regular').text('VAT:', sumX, Y);
        doc.font('Bold').text(money(offer.totalVat, offer.currency), sumX + 60, Y, { width: 120, align: 'right' });
        Y += 18;
        doc.rect(sumX, Y, 180, 22).fill(colors.primary);
        doc.font('Bold').fontSize(10).fillColor('#fff').text('BRUTTO:', sumX + 8, Y + 6);
        doc.text(money(offer.totalGross, offer.currency), sumX + 60, Y + 6, { width: 112, align: 'right' });

        return Y + 35;
    }

    private renderTerms(doc: PDFKit.PDFDocument, offer: PDFOffer, Y: number): number {
        const { colors, layout, sizes } = this.config;

        if (offer.terms) {
            if (Y > 680) { doc.addPage(); Y = 40; }
            doc.font('Bold').fontSize(sizes.header).fillColor(colors.text).text('Warunki:', layout.leftMargin, Y);
            Y += 12;
            doc.font('Regular').fontSize(sizes.normal).fillColor(colors.textLight)
                .text(txt(offer.terms), layout.leftMargin, Y, { width: layout.contentWidth });
            Y += 25;
        }

        return Y;
    }

    private renderSignature(doc: PDFKit.PDFDocument, Y: number): number {
        const { colors } = this.config;

        doc.moveTo(380, Y + 20).lineTo(555, Y + 20).stroke(colors.border);
        doc.font('Regular').fontSize(7).fillColor('#94a3b8').text('Podpis', 380, Y + 24, { width: 175, align: 'center' });

        return Y;
    }

    private renderFooter(doc: PDFKit.PDFDocument, Y: number): void {
        const { colors, layout } = this.config;
        const targetY = 720;

        if (Y < targetY) Y = targetY;
        doc.moveTo(layout.leftMargin, Y + 20).lineTo(layout.leftMargin + layout.contentWidth, Y + 20).stroke(colors.border);
        doc.font('Regular').fontSize(7).fillColor('#94a3b8')
            .text('Wygenerowano w SmartQuote AI | ' + date(new Date()), layout.leftMargin, Y + 25, { width: layout.contentWidth, align: 'center' });
    }

    private renderAuditTrailPage(doc: PDFKit.PDFDocument, offer: PDFOffer, log: PDFAcceptanceLog): void {
        logger.debug({ offerId: offer.id }, 'Rendering audit trail page');

        doc.addPage();

        const { colors, layout, sizes } = this.config;
        let Y = 40;

        doc.rect(0, 0, layout.pageWidth, layout.headerHeight).fill(colors.success);
        doc.font('Bold').fontSize(sizes.title).fillColor('#fff')
            .text('CERTIFICATE OF ACCEPTANCE', layout.leftMargin, 10);
        doc.font('Regular').fontSize(sizes.header).fillColor('#d1fae5')
            .text('Formalne potwierdzenie akceptacji oferty', layout.leftMargin, 30);
        doc.font('Regular').fontSize(sizes.normal).fillColor('#fff')
            .text('SmartQuote AI', 400, 10, { width: 155, align: 'right' });
        doc.text(dateTime(log.acceptedAt), 400, 22, { width: 155, align: 'right' });

        Y = 65;
        Y = this.renderAuditHeader(doc, offer, log, Y);
        Y = this.renderAuditParties(doc, offer, log, Y);
        Y = this.renderAuditDetails(doc, offer, log, Y);
        Y = this.renderAuditUserAgent(doc, log, Y);
        Y = this.renderAuditContentHash(doc, log, Y);
        Y = this.renderAuditDeclaration(doc, offer, log, Y);
        this.renderAuditFooter(doc, Y);
    }

    private renderAuditHeader(doc: PDFKit.PDFDocument, offer: PDFOffer, log: PDFAcceptanceLog, Y: number): number {
        const { colors, layout } = this.config;

        doc.rect(layout.leftMargin, Y, layout.contentWidth, 55).fill(colors.successLight).stroke('#a7f3d0');
        doc.font('Bold').fontSize(10).fillColor('#065f46').text('Oferta zaakceptowana', layout.leftMargin + 15, Y + 8);
        doc.font('Regular').fontSize(9).fillColor('#047857').text(txt(offer.title), layout.leftMargin + 15, Y + 22);
        doc.font('Bold').fontSize(9).fillColor('#065f46').text('Nr: ' + offer.number, layout.leftMargin + 15, Y + 36);
        doc.font('Bold').fontSize(12).fillColor('#065f46')
            .text(money(log.totalGross, log.currency), 350, Y + 18, { width: layout.contentWidth - 350 + layout.leftMargin - 15, align: 'right' });

        return Y + 70;
    }

    private renderAuditParties(doc: PDFKit.PDFDocument, offer: PDFOffer, log: PDFAcceptanceLog, Y: number): number {
        const { colors, layout } = this.config;
        const colW = (layout.contentWidth - 15) / 2;

        doc.rect(layout.leftMargin, Y, colW, 16).fill(colors.success);
        doc.font('Bold').fontSize(8).fillColor('#fff').text('AKCEPTUJĄCY', layout.leftMargin + 8, Y + 4);
        doc.rect(layout.leftMargin, Y + 16, colW, 50).fill('#f8fafc').stroke(colors.border);
        doc.font('Bold').fontSize(9).fillColor(colors.text).text(txt(log.clientName || '-'), layout.leftMargin + 8, Y + 22);
        doc.font('Regular').fontSize(8).fillColor(colors.textLight).text(log.clientEmail || '-', layout.leftMargin + 8, Y + 34);

        const rX = layout.leftMargin + colW + 15;
        doc.rect(rX, Y, colW, 16).fill(colors.success);
        doc.font('Bold').fontSize(8).fillColor('#fff').text('SPRZEDAWCA', rX + 8, Y + 4);
        doc.rect(rX, Y + 16, colW, 50).fill('#f8fafc').stroke(colors.border);
        const seller = txt(offer.user.company || offer.user.name || '');
        doc.font('Bold').fontSize(9).fillColor(colors.text).text(seller, rX + 8, Y + 22);
        doc.font('Regular').fontSize(8).fillColor(colors.textLight).text(offer.user.email, rX + 8, Y + 34);

        return Y + 80;
    }

    private renderAuditDetails(doc: PDFKit.PDFDocument, offer: PDFOffer, log: PDFAcceptanceLog, Y: number): number {
        const { colors, layout } = this.config;

        doc.rect(layout.leftMargin, Y, layout.contentWidth, 16).fill('#0f172a');
        doc.font('Bold').fontSize(8).fillColor('#fff').text('SZCZEGÓŁY AKCEPTACJI', layout.leftMargin + 8, Y + 4);
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
            doc.rect(layout.leftMargin, Y, layout.contentWidth, 18).fill(bg).stroke(colors.border);
            doc.font('Regular').fontSize(8).fillColor(colors.textLight).text(label, layout.leftMargin + 8, Y + 5);
            doc.font('Bold').fontSize(8).fillColor(colors.text)
                .text(value, layout.leftMargin + 200, Y + 5, { width: layout.contentWidth - 208, align: 'right' });
            Y += 18;
        });

        return Y + 10;
    }

    private renderAuditUserAgent(doc: PDFKit.PDFDocument, log: PDFAcceptanceLog, Y: number): number {
        const { colors, layout } = this.config;

        doc.rect(layout.leftMargin, Y, layout.contentWidth, 16).fill('#0f172a');
        doc.font('Bold').fontSize(8).fillColor('#fff').text('USER AGENT', layout.leftMargin + 8, Y + 4);
        Y += 16;

        doc.rect(layout.leftMargin, Y, layout.contentWidth, 28).fill('#f8fafc').stroke(colors.border);
        const uaTruncated = log.userAgent.length > 120 ? log.userAgent.slice(0, 120) + '...' : log.userAgent;
        doc.font('Mono').fontSize(6).fillColor(colors.textLight).text(uaTruncated, layout.leftMargin + 8, Y + 4, { width: layout.contentWidth - 16 });

        return Y + 42;
    }

    private renderAuditContentHash(doc: PDFKit.PDFDocument, log: PDFAcceptanceLog, Y: number): number {
        const { colors, layout } = this.config;

        doc.rect(layout.leftMargin, Y, layout.contentWidth, 16).fill('#0f172a');
        doc.font('Bold').fontSize(8).fillColor('#fff').text('CONTENT HASH (SHA-256)', layout.leftMargin + 8, Y + 4);
        Y += 16;

        doc.rect(layout.leftMargin, Y, layout.contentWidth, 24).fill('#0f172a').stroke('#1e293b');
        doc.font('Mono').fontSize(7).fillColor('#34d399').text(log.contentHash, layout.leftMargin + 8, Y + 8, { width: layout.contentWidth - 16 });
        Y += 28;

        doc.font('Regular').fontSize(7).fillColor(colors.textLight)
            .text(
                'Hash SHA-256 wygenerowany z zawartości oferty (pozycje, ceny, wariant, waluta). ' +
                'Służy do weryfikacji integralności danych w momencie akceptacji.',
                layout.leftMargin, Y + 4, { width: layout.contentWidth }
            );

        return Y + 28;
    }

    private renderAuditDeclaration(doc: PDFKit.PDFDocument, offer: PDFOffer, log: PDFAcceptanceLog, Y: number): number {
        const { colors, layout } = this.config;

        doc.rect(layout.leftMargin, Y, layout.contentWidth, 45).fill(colors.successLight).stroke('#a7f3d0');
        doc.font('Bold').fontSize(8).fillColor('#065f46').text('Oświadczenie', layout.leftMargin + 10, Y + 6);
        doc.font('Regular').fontSize(7).fillColor('#047857')
            .text(
                'Niniejszy certyfikat potwierdza, że osoba wskazana powyżej zaakceptowała ofertę ' +
                'nr ' + offer.number + ' w dniu ' + dateTime(log.acceptedAt) + '. ' +
                'Dane zostały zarejestrowane automatycznie przez system SmartQuote AI i są niemodyfikowalne. ' +
                'Hash SHA-256 umożliwia weryfikację integralności treści oferty w momencie akceptacji.',
                layout.leftMargin + 10, Y + 18, { width: layout.contentWidth - 20 }
            );

        return Y + 55;
    }

    private renderAuditFooter(doc: PDFKit.PDFDocument, Y: number): void {
        const { colors, layout } = this.config;

        doc.moveTo(layout.leftMargin, Y + 10).lineTo(layout.leftMargin + layout.contentWidth, Y + 10).stroke(colors.border);
        doc.font('Regular').fontSize(7).fillColor('#94a3b8')
            .text(
                'Certificate of Acceptance | SmartQuote AI | Wygenerowano: ' + dateTime(new Date()),
                layout.leftMargin, Y + 15, { width: layout.contentWidth, align: 'center' }
            );
    }
}

export const offerPDFRenderer = new OfferPDFRenderer();