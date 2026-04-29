// src/services/pdf/offer-pdf-renderer.ts
import { PDFOffer } from './types';
import { createDoc } from './helpers';
import { createModuleLogger } from '../../lib/logger';
import { offerDocumentRenderer } from './offer-document-renderer';
import { offerAcceptanceCertificateRenderer } from './offer-acceptance-cert-renderer';

const logger = createModuleLogger('offer-pdf-renderer');

export class OfferPDFRenderer {
    async render(offer: PDFOffer): Promise<Buffer> {
        logger.info({ offerId: offer.id, offerNumber: offer.number }, 'Starting PDF rendering');

        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            const doc = createDoc();

            doc.on('data', (chunk: Buffer) => chunks.push(chunk));
            doc.on('end', () => {
                logger.info({ offerId: offer.id, chunks: chunks.length }, 'PDF rendering completed');
                resolve(Buffer.concat(chunks));
            });
            doc.on('error', (err: Error) => {
                logger.error({ err, offerId: offer.id }, 'PDF rendering failed');
                reject(err);
            });

            try {
                offerDocumentRenderer.render(doc, offer);

                if (offer.acceptanceLog) {
                    offerAcceptanceCertificateRenderer.render(doc, offer, offer.acceptanceLog);
                }

                doc.end();
            } catch (err) {
                logger.error({ err, offerId: offer.id }, 'Error during PDF rendering');
                reject(err);
            }
        });
    }
}

export const offerPDFRenderer = new OfferPDFRenderer();