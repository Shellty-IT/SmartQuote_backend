// src/services/pdf/contract-document-renderer.ts
import { PDFContract } from './types';
import { txt, money, date, contractStatusMap, renderItemsTable, tryRenderLogo } from './helpers';
import { CONTRACT_CONFIG } from './pdf-config';

export class ContractDocumentRenderer {
    private readonly config = CONTRACT_CONFIG;

    render(doc: PDFKit.PDFDocument, contract: PDFContract): number {
        let Y = 40;

        Y = this.renderHeader(doc, contract, Y);
        Y = this.renderTitle(doc, contract, Y);
        Y = this.renderParties(doc, contract, Y);
        Y = this.renderMetadata(doc, contract, Y);
        Y = this.renderDescription(doc, contract, Y);
        Y = this.renderItems(doc, contract, Y);
        Y = this.renderSummary(doc, contract, Y);
        Y = this.renderTerms(doc, contract, Y);
        Y = this.renderPaymentTerms(doc, contract, Y);
        Y = this.renderPaymentDays(doc, contract, Y);
        Y = this.renderSignatureLines(doc, Y);
        this.renderFooter(doc, Y);

        return Y;
    }

    private renderHeader(doc: PDFKit.PDFDocument, contract: PDFContract, Y: number): number {
        const { colors, layout, sizes, dimensions } = this.config;

        doc.rect(0, 0, layout.pageWidth, layout.headerHeight).fill(colors.primary);

        const hasLogo = tryRenderLogo(doc, contract.user.logo, layout.leftMargin, 8, 120, 34);
        if (!hasLogo) {
            doc.font('Bold').fontSize(18).fillColor(colors.white).text('SmartQuote', layout.leftMargin, 16);
        }

        const companyName = txt(contract.user.company || contract.user.name || contract.user.email);
        doc.font('Bold').fontSize(sizes.header).fillColor(colors.white)
            .text(companyName, dimensions.headerRightX, 8, { width: dimensions.headerRightW, align: 'right' });

        doc.font('Regular').fontSize(7.5).fillColor(colors.headerSubtext);

        let hY = 20;
        if (contract.user.nip) {
            doc.text('NIP: ' + contract.user.nip, dimensions.headerRightX, hY, { width: dimensions.headerRightW, align: 'right' });
            hY += 10;
        }
        if (contract.user.email) {
            doc.text(contract.user.email, dimensions.headerRightX, hY, { width: dimensions.headerRightW, align: 'right' });
            hY += 10;
        }
        if (contract.user.phone) {
            doc.text(contract.user.phone, dimensions.headerRightX, hY, { width: dimensions.headerRightW, align: 'right' });
        }

        return Y;
    }

    private renderTitle(doc: PDFKit.PDFDocument, contract: PDFContract, Y: number): number {
        const { colors, layout, sizes } = this.config;

        Y = 60;
        doc.font('Bold').fontSize(sizes.title).fillColor(colors.text).text('UMOWA', layout.leftMargin, Y);
        doc.font('Regular').fontSize(10).fillColor(colors.primary)
            .text('Nr: ' + contract.number, layout.leftMargin + 80, Y + 2);

        return Y + 28;
    }

    private renderParties(doc: PDFKit.PDFDocument, contract: PDFContract, Y: number): number {
        const { layout, dimensions } = this.config;
        const { partyBoxWidth, partyBoxHeight, partyBoxGap } = dimensions;

        this.renderSellerBox(doc, contract, layout.leftMargin, Y, partyBoxWidth, partyBoxHeight);
        this.renderBuyerBox(doc, contract, layout.leftMargin + partyBoxWidth + partyBoxGap, Y, partyBoxWidth, partyBoxHeight);

        return Y + partyBoxHeight + 10;
    }

    private renderSellerBox(
        doc: PDFKit.PDFDocument,
        contract: PDFContract,
        x: number,
        y: number,
        width: number,
        height: number,
    ): void {
        const { colors, sizes } = this.config;
        const companyName = txt(contract.user.company || contract.user.name || contract.user.email);

        doc.rect(x, y, width, height).fill(colors.background);
        doc.rect(x, y, width, 16).fill(colors.primary);
        doc.font('Bold').fontSize(sizes.normal).fillColor(colors.white).text('WYKONAWCA', x + 8, y + 4);
        doc.font('Bold').fontSize(sizes.header).fillColor(colors.text).text(companyName, x + 8, y + 20);
        doc.font('Regular').fontSize(sizes.small).fillColor(colors.textMuted);

        let sY = y + 32;
        if (contract.user.nip) { doc.text('NIP: ' + contract.user.nip, x + 8, sY); sY += 10; }
        if (contract.user.address) {
            const addrLine = [contract.user.address, contract.user.postalCode, contract.user.city]
                .filter(Boolean).join(', ');
            doc.text(addrLine, x + 8, sY, { width: width - 16 });
            sY += 10;
        }
        if (contract.user.email) { doc.text(contract.user.email, x + 8, sY); sY += 10; }
        if (contract.user.phone) { doc.text(contract.user.phone, x + 8, sY); }
    }

    private renderBuyerBox(
        doc: PDFKit.PDFDocument,
        contract: PDFContract,
        x: number,
        y: number,
        width: number,
        height: number,
    ): void {
        const { colors, sizes } = this.config;
        const clientName = txt(contract.client.type === 'COMPANY'
            ? (contract.client.company || contract.client.name)
            : contract.client.name);

        doc.rect(x, y, width, height).fill(colors.background);
        doc.rect(x, y, width, 16).fill(colors.primary);
        doc.font('Bold').fontSize(sizes.normal).fillColor(colors.white).text('ZLECENIODAWCA', x + 8, y + 4);
        doc.font('Bold').fontSize(sizes.header).fillColor(colors.text).text(clientName, x + 8, y + 20);
        doc.font('Regular').fontSize(sizes.small).fillColor(colors.textMuted);

        let cY = y + 32;
        if (contract.client.nip) { doc.text('NIP: ' + contract.client.nip, x + 8, cY); cY += 10; }
        if (contract.client.address) { doc.text(txt(contract.client.address), x + 8, cY); cY += 10; }
        if (contract.client.city) {
            doc.text(txt((contract.client.postalCode || '') + ' ' + contract.client.city), x + 8, cY);
            cY += 10;
        }
        if (contract.client.email) { doc.text(contract.client.email, x + 8, cY); }
    }

    private renderMetadata(doc: PDFKit.PDFDocument, contract: PDFContract, Y: number): number {
        const { colors, layout, sizes, dimensions } = this.config;
        const { metadataColumns, metadataHeight } = dimensions;

        doc.rect(layout.leftMargin, Y, layout.contentWidth, metadataHeight).fill(colors.background);

        const infos: [string, string][] = [
            ['Data zawarcia', date(contract.createdAt)],
            ['Obowiązuje od', date(contract.startDate)],
            ['Obowiązuje do', date(contract.endDate)],
            ['Status', contractStatusMap[contract.status] || contract.status],
        ];

        const iW = layout.contentWidth / metadataColumns;
        infos.forEach(([lbl, val], i) => {
            const x = layout.leftMargin + i * iW + 6;
            doc.font('Regular').fontSize(sizes.tiny).fillColor(colors.textLight).text(lbl, x, Y + 4);
            doc.font('Bold').fontSize(sizes.header).fillColor(colors.text).text(val, x, Y + 13);
        });

        return Y + 32;
    }

    private renderDescription(doc: PDFKit.PDFDocument, contract: PDFContract, Y: number): number {
        const { colors, layout, sizes } = this.config;

        if (contract.title) {
            doc.font('Bold').fontSize(sizes.subtitle).fillColor(colors.text)
                .text(txt(contract.title), layout.leftMargin, Y);
            Y += 16;
        }
        if (contract.description) {
            doc.font('Regular').fontSize(sizes.normal).fillColor(colors.textLight)
                .text(txt(contract.description), layout.leftMargin, Y, { width: layout.contentWidth });
            Y += 20;
        }

        return Y;
    }

    private renderItems(doc: PDFKit.PDFDocument, contract: PDFContract, Y: number): number {
        const { colors, layout } = this.config;

        Y = renderItemsTable(doc, contract.items, Y, colors.primary, layout.contentWidth, layout.leftMargin);

        return Y + 12;
    }

    private renderSummary(doc: PDFKit.PDFDocument, contract: PDFContract, Y: number): number {
        const { colors, layout, sizes, dimensions } = this.config;
        const { summaryOffsetX, summaryBoxWidth, summaryBoxHeight } = dimensions;
        const sumX = layout.leftMargin + layout.contentWidth - summaryOffsetX;

        doc.font('Regular').fontSize(sizes.header).fillColor(colors.text).text('Netto:', sumX, Y);
        doc.font('Bold').text(money(contract.totalNet, contract.currency), sumX + 60, Y, { width: 120, align: 'right' });
        Y += 14;

        doc.font('Regular').text('VAT:', sumX, Y);
        doc.font('Bold').text(money(contract.totalVat, contract.currency), sumX + 60, Y, { width: 120, align: 'right' });
        Y += 18;

        doc.rect(sumX, Y, summaryBoxWidth, summaryBoxHeight).fill(colors.primary);
        doc.font('Bold').fontSize(10).fillColor(colors.white).text('BRUTTO:', sumX + 8, Y + 6);
        doc.text(money(contract.totalGross, contract.currency), sumX + 60, Y + 6, { width: 112, align: 'right' });

        return Y + 35;
    }

    private renderTerms(doc: PDFKit.PDFDocument, contract: PDFContract, Y: number): number {
        const { colors, layout, sizes, dimensions } = this.config;

        if (!contract.terms) return Y;

        if (Y > dimensions.pageBreakThreshold) { doc.addPage(); Y = 40; }

        doc.font('Bold').fontSize(sizes.header).fillColor(colors.text).text('Warunki umowy:', layout.leftMargin, Y);
        Y += 12;
        doc.font('Regular').fontSize(sizes.normal).fillColor(colors.textLight)
            .text(txt(contract.terms), layout.leftMargin, Y, { width: layout.contentWidth });

        return Y + 25;
    }

    private renderPaymentTerms(doc: PDFKit.PDFDocument, contract: PDFContract, Y: number): number {
        const { colors, layout, sizes, dimensions } = this.config;

        if (!contract.paymentTerms) return Y;

        if (Y > dimensions.pageBreakThreshold) { doc.addPage(); Y = 40; }

        doc.font('Bold').fontSize(sizes.header).fillColor(colors.text).text('Warunki płatności:', layout.leftMargin, Y);
        Y += 12;
        doc.font('Regular').fontSize(sizes.normal).fillColor(colors.textLight)
            .text(txt(contract.paymentTerms), layout.leftMargin, Y, { width: layout.contentWidth });

        return Y + 25;
    }

    private renderPaymentDays(doc: PDFKit.PDFDocument, contract: PDFContract, Y: number): number {
        const { colors, layout, sizes } = this.config;

        doc.font('Regular').fontSize(sizes.normal).fillColor(colors.textLight)
            .text('Termin płatności: ' + contract.paymentDays + ' dni', layout.leftMargin, Y);

        return Y + 20;
    }

    private renderSignatureLines(doc: PDFKit.PDFDocument, Y: number): number {
        const { colors } = this.config;

        doc.moveTo(40, Y + 20).lineTo(215, Y + 20).stroke(colors.border);
        doc.font('Regular').fontSize(7).fillColor(colors.footerText)
            .text('Podpis Wykonawcy', 40, Y + 24, { width: 175, align: 'center' });

        doc.moveTo(380, Y + 20).lineTo(555, Y + 20).stroke(colors.border);
        doc.font('Regular').fontSize(7).fillColor(colors.footerText)
            .text('Podpis Zleceniodawcy', 380, Y + 24, { width: 175, align: 'center' });

        return Y;
    }

    private renderFooter(doc: PDFKit.PDFDocument, Y: number): void {
        const { colors, layout, dimensions } = this.config;

        if (Y < dimensions.footerTargetY) Y = dimensions.footerTargetY;

        doc.moveTo(layout.leftMargin, Y + 20)
            .lineTo(layout.leftMargin + layout.contentWidth, Y + 20)
            .stroke(colors.border);
        doc.font('Regular').fontSize(7).fillColor(colors.footerText)
            .text(
                'Wygenerowano w SmartQuote AI | ' + date(new Date()),
                layout.leftMargin, Y + 25,
                { width: layout.contentWidth, align: 'center' },
            );
    }
}

export const contractDocumentRenderer = new ContractDocumentRenderer();