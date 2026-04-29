// src/services/pdf/contract-signature-renderer.ts
import { PDFContract, PDFSignatureLog } from './types';
import { txt, money, dateTime } from './helpers';
import { CONTRACT_CONFIG } from './pdf-config';

export class ContractSignatureCertificateRenderer {
    private readonly config = CONTRACT_CONFIG;

    render(doc: PDFKit.PDFDocument, contract: PDFContract, log: PDFSignatureLog): void {
        doc.addPage();

        let Y = 40;

        Y = this.renderHeader(doc, log, Y);
        Y = this.renderSummary(doc, contract, log, Y);
        Y = this.renderParties(doc, contract, log, Y);
        Y = this.renderImage(doc, log, Y);
        Y = this.renderDetails(doc, contract, log, Y);
        Y = this.renderUserAgent(doc, log, Y);
        Y = this.renderContentHash(doc, log, Y);
        Y = this.renderDeclaration(doc, contract, log, Y);
        this.renderFooter(doc, Y);
    }

    private renderHeader(doc: PDFKit.PDFDocument, log: PDFSignatureLog, Y: number): number {
        const { colors, layout, sizes, dimensions } = this.config;

        doc.rect(0, 0, layout.pageWidth, layout.headerHeight).fill(colors.primary);
        doc.font('Bold').fontSize(sizes.title).fillColor(colors.white)
            .text('CERTIFICATE OF SIGNATURE', layout.leftMargin, 10);
        doc.font('Regular').fontSize(sizes.header).fillColor(colors.headerSubtext)
            .text('Formalne potwierdzenie podpisu umowy', layout.leftMargin, 30);
        doc.font('Regular').fontSize(sizes.normal).fillColor(colors.white)
            .text('SmartQuote AI', dimensions.headerRightX, 10, { width: dimensions.headerRightW, align: 'right' });
        doc.text(dateTime(log.signedAt), dimensions.headerRightX, 22, { width: dimensions.headerRightW, align: 'right' });

        return 65;
    }

    private renderSummary(doc: PDFKit.PDFDocument, contract: PDFContract, log: PDFSignatureLog, Y: number): number {
        const { colors, layout, sizes, dimensions } = this.config;
        const { auditSummaryHeight } = dimensions;

        doc.rect(layout.leftMargin, Y, layout.contentWidth, auditSummaryHeight)
            .fill(colors.primaryLight).stroke(colors.successBorder);
        doc.font('Bold').fontSize(10).fillColor(colors.successText)
            .text('Umowa podpisana', layout.leftMargin + 15, Y + 8);
        doc.font('Regular').fontSize(sizes.header).fillColor(colors.successSubtext)
            .text(txt(contract.title), layout.leftMargin + 15, Y + 22);
        doc.font('Bold').fontSize(sizes.header).fillColor(colors.successText)
            .text('Nr: ' + contract.number, layout.leftMargin + 15, Y + 36);
        doc.font('Bold').fontSize(12).fillColor(colors.successText)
            .text(money(log.totalGross, log.currency), 350, Y + 18, {
                width: layout.contentWidth - 350 + layout.leftMargin - 15,
                align: 'right',
            });

        return Y + auditSummaryHeight + 15;
    }

    private renderParties(doc: PDFKit.PDFDocument, contract: PDFContract, log: PDFSignatureLog, Y: number): number {
        const { colors, layout } = this.config;
        const colW = (layout.contentWidth - 15) / 2;

        doc.rect(layout.leftMargin, Y, colW, 16).fill(colors.primary);
        doc.font('Bold').fontSize(8).fillColor(colors.white).text('PODPISUJĄCY', layout.leftMargin + 8, Y + 4);
        doc.rect(layout.leftMargin, Y + 16, colW, 50).fill(colors.rowAlt).stroke(colors.border);
        doc.font('Bold').fontSize(9).fillColor(colors.text).text(txt(log.signerName), layout.leftMargin + 8, Y + 22);
        doc.font('Regular').fontSize(8).fillColor(colors.textLight).text(log.signerEmail, layout.leftMargin + 8, Y + 34);

        const rX = layout.leftMargin + colW + 15;
        doc.rect(rX, Y, colW, 16).fill(colors.primary);
        doc.font('Bold').fontSize(8).fillColor(colors.white).text('WYKONAWCA', rX + 8, Y + 4);
        doc.rect(rX, Y + 16, colW, 50).fill(colors.rowAlt).stroke(colors.border);
        const seller = txt(contract.user.company || contract.user.name || '');
        doc.font('Bold').fontSize(9).fillColor(colors.text).text(seller, rX + 8, Y + 22);
        doc.font('Regular').fontSize(8).fillColor(colors.textLight).text(contract.user.email, rX + 8, Y + 34);

        return Y + 80;
    }

    private renderImage(doc: PDFKit.PDFDocument, log: PDFSignatureLog, Y: number): number {
        const { colors, layout, sizes, dimensions } = this.config;
        const { auditSectionHeaderHeight, auditSignatureBoxHeight, auditSignatureWidth, auditSignatureHeight } = dimensions;

        doc.rect(layout.leftMargin, Y, layout.contentWidth, auditSectionHeaderHeight).fill(colors.dark);
        doc.font('Bold').fontSize(sizes.normal).fillColor(colors.white)
            .text('PODPIS ELEKTRONICZNY', layout.leftMargin + 8, Y + 4);
        Y += auditSectionHeaderHeight;

        doc.rect(layout.leftMargin, Y, layout.contentWidth, auditSignatureBoxHeight)
            .fill(colors.white).stroke(colors.border);

        try {
            const base64Data = log.signatureImage.replace(/^data:image\/\w+;base64,/, '');
            const imgBuffer = Buffer.from(base64Data, 'base64');
            const imgX = layout.leftMargin + (layout.contentWidth - auditSignatureWidth) / 2;
            doc.image(imgBuffer, imgX, Y + 5, {
                width: auditSignatureWidth,
                height: auditSignatureHeight,
                fit: [auditSignatureWidth, auditSignatureHeight],
                align: 'center',
                valign: 'center',
            });
        } catch {
            doc.font('Regular').fontSize(sizes.header).fillColor(colors.footerText)
                .text('Podpis niedostępny', layout.leftMargin + 8, Y + 35, {
                    width: layout.contentWidth - 16,
                    align: 'center',
                });
        }

        return Y + auditSignatureBoxHeight + 4;
    }

    private renderDetails(doc: PDFKit.PDFDocument, contract: PDFContract, log: PDFSignatureLog, Y: number): number {
        const { colors, layout, sizes, dimensions } = this.config;
        const { auditSectionHeaderHeight, auditRowHeight, auditLabelWidth } = dimensions;

        doc.rect(layout.leftMargin, Y, layout.contentWidth, auditSectionHeaderHeight).fill(colors.dark);
        doc.font('Bold').fontSize(sizes.normal).fillColor(colors.white)
            .text('SZCZEGÓŁY PODPISU', layout.leftMargin + 8, Y + 4);
        Y += auditSectionHeaderHeight;

        const details: [string, string][] = [
            ['Data i czas podpisu', dateTime(log.signedAt)],
            ['Kwota netto', money(log.totalNet, log.currency)],
            ['Kwota VAT', money(log.totalVat, log.currency)],
            ['Kwota brutto', money(log.totalGross, log.currency)],
            ['Adres IP', log.ipAddress],
            ['Zleceniodawca', txt(contract.client.type === 'COMPANY'
                ? (contract.client.company || contract.client.name)
                : contract.client.name)],
        ];

        if (contract.client.nip) {
            details.push(['NIP zleceniodawcy', contract.client.nip]);
        }

        details.forEach(([label, value], idx) => {
            const bg = idx % 2 === 0 ? colors.white : colors.rowAlt;
            doc.rect(layout.leftMargin, Y, layout.contentWidth, auditRowHeight).fill(bg).stroke(colors.border);
            doc.font('Regular').fontSize(sizes.normal).fillColor(colors.textLight)
                .text(label, layout.leftMargin + 8, Y + 5);
            doc.font('Bold').fontSize(sizes.normal).fillColor(colors.text)
                .text(value, layout.leftMargin + auditLabelWidth, Y + 5, {
                    width: layout.contentWidth - auditLabelWidth - 8,
                    align: 'right',
                });
            Y += auditRowHeight;
        });

        return Y + 10;
    }

    private renderUserAgent(doc: PDFKit.PDFDocument, log: PDFSignatureLog, Y: number): number {
        const { colors, layout, sizes, dimensions } = this.config;
        const { auditSectionHeaderHeight, auditUserAgentHeight } = dimensions;
        const uaMaxLength = 120;

        doc.rect(layout.leftMargin, Y, layout.contentWidth, auditSectionHeaderHeight).fill(colors.dark);
        doc.font('Bold').fontSize(sizes.normal).fillColor(colors.white)
            .text('USER AGENT', layout.leftMargin + 8, Y + 4);
        Y += auditSectionHeaderHeight;

        doc.rect(layout.leftMargin, Y, layout.contentWidth, auditUserAgentHeight)
            .fill(colors.rowAlt).stroke(colors.border);
        const uaTruncated = log.userAgent.length > uaMaxLength
            ? log.userAgent.slice(0, uaMaxLength) + '...'
            : log.userAgent;
        doc.font('Mono').fontSize(sizes.micro).fillColor(colors.textLight)
            .text(uaTruncated, layout.leftMargin + 8, Y + 4, { width: layout.contentWidth - 16 });

        return Y + auditUserAgentHeight + 10;
    }

    private renderContentHash(doc: PDFKit.PDFDocument, log: PDFSignatureLog, Y: number): number {
        const { colors, layout, sizes, dimensions } = this.config;
        const { auditSectionHeaderHeight, auditHashBoxHeight } = dimensions;

        doc.rect(layout.leftMargin, Y, layout.contentWidth, auditSectionHeaderHeight).fill(colors.dark);
        doc.font('Bold').fontSize(sizes.normal).fillColor(colors.white)
            .text('CONTENT HASH (SHA-256)', layout.leftMargin + 8, Y + 4);
        Y += auditSectionHeaderHeight;

        doc.rect(layout.leftMargin, Y, layout.contentWidth, auditHashBoxHeight)
            .fill(colors.dark).stroke(colors.dark);
        doc.font('Mono').fontSize(sizes.tiny).fillColor(colors.auditHash)
            .text(log.contentHash, layout.leftMargin + 8, Y + 8, { width: layout.contentWidth - 16 });
        Y += auditHashBoxHeight + 4;

        doc.font('Regular').fontSize(sizes.tiny).fillColor(colors.textLight)
            .text(
                'Hash SHA-256 wygenerowany z zawartości umowy (pozycje, ceny, waluta). ' +
                'Służy do weryfikacji integralności danych w momencie podpisu.',
                layout.leftMargin, Y + 4, { width: layout.contentWidth },
            );

        return Y + 28;
    }

    private renderDeclaration(doc: PDFKit.PDFDocument, contract: PDFContract, log: PDFSignatureLog, Y: number): number {
        const { colors, layout, sizes, dimensions } = this.config;
        const { auditDeclarationHeight } = dimensions;

        doc.rect(layout.leftMargin, Y, layout.contentWidth, auditDeclarationHeight)
            .fill(colors.primaryLight).stroke(colors.successBorder);
        doc.font('Bold').fontSize(sizes.normal).fillColor(colors.successText)
            .text('Oświadczenie', layout.leftMargin + 10, Y + 6);
        doc.font('Regular').fontSize(sizes.tiny).fillColor(colors.successSubtext)
            .text(
                'Niniejszy certyfikat potwierdza, że osoba wskazana powyżej podpisała umowę ' +
                'nr ' + contract.number + ' w dniu ' + dateTime(log.signedAt) + '. ' +
                'Podpis elektroniczny i dane zostały zarejestrowane automatycznie przez system SmartQuote AI ' +
                'i są niemodyfikowalne. Hash SHA-256 umożliwia weryfikację integralności treści umowy w momencie podpisu.',
                layout.leftMargin + 10, Y + 18, { width: layout.contentWidth - 20 },
            );

        return Y + auditDeclarationHeight + 10;
    }

    private renderFooter(doc: PDFKit.PDFDocument, Y: number): void {
        const { colors, layout, sizes } = this.config;

        doc.moveTo(layout.leftMargin, Y + 10)
            .lineTo(layout.leftMargin + layout.contentWidth, Y + 10)
            .stroke(colors.border);
        doc.font('Regular').fontSize(sizes.tiny).fillColor(colors.footerText)
            .text(
                'Certificate of Signature | SmartQuote AI | Wygenerowano: ' + dateTime(new Date()),
                layout.leftMargin, Y + 15,
                { width: layout.contentWidth, align: 'center' },
            );
    }
}

export const contractSignatureCertificateRenderer = new ContractSignatureCertificateRenderer();