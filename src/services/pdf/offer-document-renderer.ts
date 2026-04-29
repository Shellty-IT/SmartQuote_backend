// src/services/pdf/offer-document-renderer.ts
import { PDFOffer } from './types';
import { txt, money, date, statusMap, groupItemsByVariant, renderItemsTable } from './helpers';
import { PDF_CONFIG } from './pdf-config';
import { Decimal } from '@prisma/client/runtime/library';
import { offerPartiesRenderer } from './offer-parties-renderer';

type VariantGroupInternal = {
    name: string | null;
    items: Array<{
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
    }>;
    totalNet: Decimal;
    totalVat: Decimal;
    totalGross: Decimal;
};

export class OfferDocumentRenderer {
    private readonly config = PDF_CONFIG;

    render(doc: PDFKit.PDFDocument, offer: PDFOffer): number {
        let Y = 40;

        offerPartiesRenderer.renderHeader(doc, offer);
        Y = this.renderTitle(doc, offer, Y);
        Y = offerPartiesRenderer.renderParties(doc, offer, Y);
        Y = this.renderMetadata(doc, offer, Y);
        Y = this.renderDescription(doc, offer, Y);
        Y = this.renderItems(doc, offer, Y);
        Y = this.renderSummary(doc, offer, Y);
        Y = this.renderTerms(doc, offer, Y);
        Y = this.renderSignature(doc, Y);
        this.renderFooter(doc, Y);

        return Y;
    }

    private renderTitle(doc: PDFKit.PDFDocument, offer: PDFOffer, Y: number): number {
        const { colors, layout, sizes } = this.config;

        Y = 60;
        doc.font('Bold').fontSize(sizes.title).fillColor(colors.text)
            .text('OFERTA HANDLOWA', layout.leftMargin, Y);
        Y += 6;
        doc.font('Regular').fontSize(10).fillColor(colors.primary)
            .text('Nr: ' + offer.number, layout.leftMargin, Y + 16);

        return Y + 34;
    }

    private renderMetadata(doc: PDFKit.PDFDocument, offer: PDFOffer, Y: number): number {
        const { colors, layout, sizes, dimensions } = this.config;

        doc.rect(layout.leftMargin, Y, layout.contentWidth, dimensions.metadataHeight)
            .fill(colors.background);

        const infos: [string, string][] = [
            ['Data', date(offer.createdAt)],
            ['Ważna do', date(offer.validUntil)],
            ['Status', statusMap[offer.status] || offer.status],
            ['Płatność', offer.paymentDays + ' dni'],
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
            doc.font('Bold').fontSize(sizes.subtitle).fillColor(colors.text)
                .text(txt(offer.title), layout.leftMargin, Y);
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
        const { colors, layout, dimensions } = this.config;
        const variantGroups = groupItemsByVariant(offer.items);
        const hasVariants = variantGroups.some((g) => g.name !== null);

        for (const group of variantGroups) {
            if (Y > dimensions.pageBreakThreshold) { doc.addPage(); Y = 40; }
            if (hasVariants) { Y = this.renderVariantHeader(doc, group, Y); }
            Y = renderItemsTable(doc, group.items, Y, colors.primary, layout.contentWidth, layout.leftMargin);
            if (hasVariants) { Y = this.renderVariantSummary(doc, group, offer.currency, Y); }
            Y += 8;
        }

        return Y;
    }

    private renderVariantHeader(doc: PDFKit.PDFDocument, group: VariantGroupInternal, Y: number): number {
        const { colors, layout, sizes } = this.config;
        const label = group.name ? 'Wariant: ' + txt(group.name) : 'Pozycje wspólne';

        doc.rect(layout.leftMargin, Y, layout.contentWidth, 20)
            .fill(group.name ? colors.primaryLight : colors.background);
        doc.font('Bold').fontSize(sizes.header)
            .fillColor(group.name ? colors.primary : colors.textMuted)
            .text(label, layout.leftMargin + 8, Y + 5);

        return Y + 24;
    }

    private renderVariantSummary(
        doc: PDFKit.PDFDocument,
        group: VariantGroupInternal,
        currency: string,
        Y: number,
    ): number {
        const { colors, layout, sizes, dimensions } = this.config;
        const subX = layout.leftMargin + layout.contentWidth - dimensions.summaryOffsetX;

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
        const { colors, layout, sizes, dimensions } = this.config;
        const { summaryOffsetX, summaryBoxWidth, summaryBoxHeight } = dimensions;
        const sumX = layout.leftMargin + layout.contentWidth - summaryOffsetX;

        Y += 4;
        doc.font('Regular').fontSize(sizes.header).fillColor(colors.text).text('Netto:', sumX, Y);
        doc.font('Bold').text(money(offer.totalNet, offer.currency), sumX + 60, Y, { width: 120, align: 'right' });
        Y += 14;
        doc.font('Regular').text('VAT:', sumX, Y);
        doc.font('Bold').text(money(offer.totalVat, offer.currency), sumX + 60, Y, { width: 120, align: 'right' });
        Y += 18;

        doc.rect(sumX, Y, summaryBoxWidth, summaryBoxHeight).fill(colors.primary);
        doc.font('Bold').fontSize(10).fillColor('#fff').text('BRUTTO:', sumX + 8, Y + 6);
        doc.text(money(offer.totalGross, offer.currency), sumX + 60, Y + 6, { width: 112, align: 'right' });

        return Y + 35;
    }

    private renderTerms(doc: PDFKit.PDFDocument, offer: PDFOffer, Y: number): number {
        const { colors, layout, sizes, dimensions } = this.config;

        if (!offer.terms) return Y;
        if (Y > dimensions.pageBreakSoft) { doc.addPage(); Y = 40; }

        doc.font('Bold').fontSize(sizes.header).fillColor(colors.text).text('Warunki:', layout.leftMargin, Y);
        Y += 12;
        doc.font('Regular').fontSize(sizes.normal).fillColor(colors.textLight)
            .text(txt(offer.terms), layout.leftMargin, Y, { width: layout.contentWidth });

        return Y + 25;
    }

    private renderSignature(doc: PDFKit.PDFDocument, Y: number): number {
        const { colors } = this.config;

        doc.moveTo(380, Y + 20).lineTo(555, Y + 20).stroke(colors.border);
        doc.font('Regular').fontSize(7).fillColor('#94a3b8')
            .text('Podpis', 380, Y + 24, { width: 175, align: 'center' });

        return Y;
    }

    private renderFooter(doc: PDFKit.PDFDocument, Y: number): void {
        const { colors, layout, dimensions } = this.config;

        if (Y < dimensions.footerTargetY) Y = dimensions.footerTargetY;

        doc.moveTo(layout.leftMargin, Y + 20)
            .lineTo(layout.leftMargin + layout.contentWidth, Y + 20)
            .stroke(colors.border);
        doc.font('Regular').fontSize(7).fillColor('#94a3b8')
            .text(
                'Wygenerowano w SmartQuote AI | ' + date(new Date()),
                layout.leftMargin, Y + 25,
                { width: layout.contentWidth, align: 'center' },
            );
    }
}

export const offerDocumentRenderer = new OfferDocumentRenderer();