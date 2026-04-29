// src/services/pdf/offer-parties-renderer.ts
import { PDFOffer } from './types';
import { txt, tryRenderLogo } from './helpers';
import { PDF_CONFIG } from './pdf-config';

export class OfferPartiesRenderer {
    private readonly config = PDF_CONFIG;

    renderHeader(doc: PDFKit.PDFDocument, offer: PDFOffer): void {
        const { colors, layout } = this.config;

        doc.rect(0, 0, layout.pageWidth, layout.headerHeight).fill(colors.primary);

        const hasLogo = tryRenderLogo(doc, offer.user.logo, layout.leftMargin, 8, 120, 34);
        if (!hasLogo) {
            doc.font('Bold').fontSize(18).fillColor('#fff').text('SmartQuote', layout.leftMargin, 16);
        }

        this.renderCompanyInfo(doc, offer);
    }

    renderParties(doc: PDFKit.PDFDocument, offer: PDFOffer, Y: number): number {
        const { layout, dimensions } = this.config;
        const { partyBoxWidth, partyBoxHeight, partyBoxGap } = dimensions;

        this.renderSellerBox(doc, offer, layout.leftMargin, Y, partyBoxWidth, partyBoxHeight);
        this.renderBuyerBox(doc, offer, layout.leftMargin + partyBoxWidth + partyBoxGap, Y, partyBoxWidth, partyBoxHeight);

        return Y + partyBoxHeight + 10;
    }

    private renderCompanyInfo(doc: PDFKit.PDFDocument, offer: PDFOffer): void {
        const { sizes } = this.config;
        const companyName = txt(offer.user.company || offer.user.name || offer.user.email);
        const headerRightX = 340;
        const headerRightW = 215;

        doc.font('Bold').fontSize(sizes.header).fillColor('#fff')
            .text(companyName, headerRightX, 8, { width: headerRightW, align: 'right' });
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

    private renderSellerBox(
        doc: PDFKit.PDFDocument,
        offer: PDFOffer,
        x: number,
        y: number,
        width: number,
        height: number,
    ): void {
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
            const addrLine = [offer.user.address, offer.user.postalCode, offer.user.city]
                .filter(Boolean).join(', ');
            doc.text(addrLine, x + 8, sY, { width: width - 16 });
            sY += 10;
        }
        if (offer.user.email) { doc.text(offer.user.email, x + 8, sY); sY += 10; }
        if (offer.user.phone) { doc.text(offer.user.phone, x + 8, sY); }
    }

    private renderBuyerBox(
        doc: PDFKit.PDFDocument,
        offer: PDFOffer,
        x: number,
        y: number,
        width: number,
        height: number,
    ): void {
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
            doc.text(txt((offer.client.postalCode || '') + ' ' + offer.client.city), x + 8, cY);
            cY += 10;
        }
        if (offer.client.email) { doc.text(offer.client.email, x + 8, cY); }
    }
}

export const offerPartiesRenderer = new OfferPartiesRenderer();