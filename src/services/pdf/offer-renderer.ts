// src/services/pdf/offer-renderer.ts
import { PDFOffer } from './types';
import { offerPDFRenderer } from './offer-pdf-renderer';

export function renderOfferPDF(offer: PDFOffer): Promise<Buffer> {
    return offerPDFRenderer.render(offer);
}