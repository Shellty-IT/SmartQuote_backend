// src/services/pdf/offer-acceptance-cert-renderer.ts
import { PDFOffer, PDFAcceptanceLog } from './types';
import { txt, money, dateTime } from './helpers';
import { PDF_CONFIG } from './pdf-config';

export class OfferAcceptanceCertificateRenderer {
    private readonly config = PDF_CONFIG;

    render(doc: PDFKit.PDFDocument, offer: PDFOffer, log: PDFAcceptanceLog): void {
        doc.addPage();

        let Y = 40;

        Y = this.renderPageHeader(doc, log, Y);
        Y = this.renderSummary(doc, offer, log, Y);
        Y = this.renderParties(doc, offer, log, Y);
        Y = this.renderDetails(doc, offer, log, Y);
        Y = this.renderUserAgent(doc, log, Y);
        Y = this.renderContentHash(doc, log, Y);
        Y = this.renderDeclaration(doc, offer, log, Y);
        this.renderFooter(doc, Y);
    }

    private renderPageHeader(doc: PDFKit.PDFDocument, log: PDFAcceptanceLog, Y: number): number {
        const { colors, layout, sizes } = this.config;

        doc.rect(0, 0, layout.pageWidth, layout.headerHeight).fill(colors.success);
        doc.font('Bold').fontSize(sizes.title).fillColor('#fff')
            .text('CERTIFICATE OF ACCEPTANCE', layout.leftMargin, 10);
        doc.font('Regular').fontSize(sizes.header).fillColor('#d1fae5')
            .text('Formalne potwierdzenie akceptacji oferty', layout.leftMargin, 30);
        doc.font('Regular').fontSize(sizes.normal).fillColor('#fff')
            .text('SmartQuote AI', 400, 10, { width: 155, align: 'right' });
        doc.text(dateTime(log.acceptedAt), 400, 22, { width: 155, align: 'right' });

        return 65;
    }

    private renderSummary(doc: PDFKit.PDFDocument, offer: PDFOffer, log: PDFAcceptanceLog, Y: number): number {
        const { colors, layout } = this.config;

        doc.rect(layout.leftMargin, Y, layout.contentWidth, 55)
            .fill(colors.successLight).stroke('#a7f3d0');
        doc.font('Bold').fontSize(10).fillColor('#065f46')
            .text('Oferta zaakceptowana', layout.leftMargin + 15, Y + 8);
        doc.font('Regular').fontSize(9).fillColor('#047857')
            .text(txt(offer.title), layout.leftMargin + 15, Y + 22);
        doc.font('Bold').fontSize(9).fillColor('#065f46')
            .text('Nr: ' + offer.number, layout.leftMargin + 15, Y + 36);
        doc.font('Bold').fontSize(12).fillColor('#065f46')
            .text(money(log.totalGross, log.currency), 350, Y + 18, {
                width: layout.contentWidth - 350 + layout.leftMargin - 15,
                align: 'right',
            });

        return Y + 70;
    }

    private renderParties(doc: PDFKit.PDFDocument, offer: PDFOffer, log: PDFAcceptanceLog, Y: number): number {
        const { colors, layout } = this.config;
        const colW = (layout.contentWidth - 15) / 2;

        doc.rect(layout.leftMargin, Y, colW, 16).fill(colors.success);
        doc.font('Bold').fontSize(8).fillColor('#fff').text('AKCEPTUJĄCY', layout.leftMargin + 8, Y + 4);
        doc.rect(layout.leftMargin, Y + 16, colW, 50).fill('#f8fafc').stroke(colors.border);
        doc.font('Bold').fontSize(9).fillColor(colors.text)
            .text(txt(log.clientName || '-'), layout.leftMargin + 8, Y + 22);
        doc.font('Regular').fontSize(8).fillColor(colors.textLight)
            .text(log.clientEmail || '-', layout.leftMargin + 8, Y + 34);

        const rX = layout.leftMargin + colW + 15;
        doc.rect(rX, Y, colW, 16).fill(colors.success);
        doc.font('Bold').fontSize(8).fillColor('#fff').text('SPRZEDAWCA', rX + 8, Y + 4);
        doc.rect(rX, Y + 16, colW, 50).fill('#f8fafc').stroke(colors.border);
        const seller = txt(offer.user.company || offer.user.name || '');
        doc.font('Bold').fontSize(9).fillColor(colors.text).text(seller, rX + 8, Y + 22);
        doc.font('Regular').fontSize(8).fillColor(colors.textLight)
            .text(offer.user.email, rX + 8, Y + 34);

        return Y + 80;
    }

    private renderDetails(doc: PDFKit.PDFDocument, offer: PDFOffer, log: PDFAcceptanceLog, Y: number): number {
        const { colors, layout, dimensions } = this.config;
        const { auditSectionHeaderHeight, auditRowHeight, auditLabelWidth } = dimensions;

        doc.rect(layout.leftMargin, Y, layout.contentWidth, auditSectionHeaderHeight).fill('#0f172a');
        doc.font('Bold').fontSize(8).fillColor('#fff')
            .text('SZCZEGÓŁY AKCEPTACJI', layout.leftMargin + 8, Y + 4);
        Y += auditSectionHeaderHeight;

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
            doc.rect(layout.leftMargin, Y, layout.contentWidth, auditRowHeight)
                .fill(bg).stroke(colors.border);
            doc.font('Regular').fontSize(8).fillColor(colors.textLight)
                .text(label, layout.leftMargin + 8, Y + 5);
            doc.font('Bold').fontSize(8).fillColor(colors.text)
                .text(value, layout.leftMargin + auditLabelWidth, Y + 5, {
                    width: layout.contentWidth - auditLabelWidth - 8,
                    align: 'right',
                });
            Y += auditRowHeight;
        });

        return Y + 10;
    }

    private renderUserAgent(doc: PDFKit.PDFDocument, log: PDFAcceptanceLog, Y: number): number {
        const { colors, layout, dimensions } = this.config;
        const { auditSectionHeaderHeight, auditUserAgentHeight } = dimensions;
        const uaMaxLength = 120;

        doc.rect(layout.leftMargin, Y, layout.contentWidth, auditSectionHeaderHeight).fill('#0f172a');
        doc.font('Bold').fontSize(8).fillColor('#fff')
            .text('USER AGENT', layout.leftMargin + 8, Y + 4);
        Y += auditSectionHeaderHeight;

        doc.rect(layout.leftMargin, Y, layout.contentWidth, auditUserAgentHeight)
            .fill('#f8fafc').stroke(colors.border);
        const uaTruncated = log.userAgent.length > uaMaxLength
            ? log.userAgent.slice(0, uaMaxLength) + '...'
            : log.userAgent;
        doc.font('Mono').fontSize(6).fillColor(colors.textLight)
            .text(uaTruncated, layout.leftMargin + 8, Y + 4, { width: layout.contentWidth - 16 });

        return Y + 42;
    }

    private renderContentHash(doc: PDFKit.PDFDocument, log: PDFAcceptanceLog, Y: number): number {
        const { colors, layout, dimensions } = this.config;
        const { auditSectionHeaderHeight, auditHashBoxHeight } = dimensions;

        doc.rect(layout.leftMargin, Y, layout.contentWidth, auditSectionHeaderHeight).fill('#0f172a');
        doc.font('Bold').fontSize(8).fillColor('#fff')
            .text('CONTENT HASH (SHA-256)', layout.leftMargin + 8, Y + 4);
        Y += auditSectionHeaderHeight;

        doc.rect(layout.leftMargin, Y, layout.contentWidth, auditHashBoxHeight)
            .fill('#0f172a').stroke('#1e293b');
        doc.font('Mono').fontSize(7).fillColor('#34d399')
            .text(log.contentHash, layout.leftMargin + 8, Y + 8, { width: layout.contentWidth - 16 });
        Y += auditHashBoxHeight + 4;

        doc.font('Regular').fontSize(7).fillColor(colors.textLight)
            .text(
                'Hash SHA-256 wygenerowany z zawartości oferty (pozycje, ceny, wariant, waluta). ' +
                'Służy do weryfikacji integralności danych w momencie akceptacji.',
                layout.leftMargin, Y + 4, { width: layout.contentWidth },
            );

        return Y + 28;
    }

    private renderDeclaration(doc: PDFKit.PDFDocument, offer: PDFOffer, log: PDFAcceptanceLog, Y: number): number {
        const { colors, layout, dimensions } = this.config;
        const { auditDeclarationHeight } = dimensions;

        doc.rect(layout.leftMargin, Y, layout.contentWidth, auditDeclarationHeight)
            .fill(colors.successLight).stroke('#a7f3d0');
        doc.font('Bold').fontSize(8).fillColor('#065f46')
            .text('Oświadczenie', layout.leftMargin + 10, Y + 6);
        doc.font('Regular').fontSize(7).fillColor('#047857')
            .text(
                'Niniejszy certyfikat potwierdza, że osoba wskazana powyżej zaakceptowała ofertę ' +
                'nr ' + offer.number + ' w dniu ' + dateTime(log.acceptedAt) + '. ' +
                'Dane zostały zarejestrowane automatycznie przez system SmartQuote AI i są niemodyfikowalne. ' +
                'Hash SHA-256 umożliwia weryfikację integralności treści oferty w momencie akceptacji.',
                layout.leftMargin + 10, Y + 18, { width: layout.contentWidth - 20 },
            );

        return Y + auditDeclarationHeight + 10;
    }

    private renderFooter(doc: PDFKit.PDFDocument, Y: number): void {
        const { colors, layout } = this.config;

        doc.moveTo(layout.leftMargin, Y + 10)
            .lineTo(layout.leftMargin + layout.contentWidth, Y + 10)
            .stroke(colors.border);
        doc.font('Regular').fontSize(7).fillColor('#94a3b8')
            .text(
                'Certificate of Acceptance | SmartQuote AI | Wygenerowano: ' + dateTime(new Date()),
                layout.leftMargin, Y + 15,
                { width: layout.contentWidth, align: 'center' },
            );
    }
}

export const offerAcceptanceCertificateRenderer = new OfferAcceptanceCertificateRenderer();