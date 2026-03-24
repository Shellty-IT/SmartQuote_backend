// src/services/pdf/index.ts
import { PDFOffer } from './types';
import { PDFContract } from './types';
import { renderOfferPDF } from './offer-renderer';
import { renderContractPDF } from './contract-renderer';

class PDFService {
    generateOfferPDF(offer: PDFOffer): Promise<Buffer> {
        return renderOfferPDF(offer);
    }

    generateContractPDF(contract: PDFContract): Promise<Buffer> {
        return renderContractPDF(contract);
    }
}

export const pdfService = new PDFService();