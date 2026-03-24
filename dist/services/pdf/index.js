"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pdfService = void 0;
const offer_renderer_1 = require("./offer-renderer");
const contract_renderer_1 = require("./contract-renderer");
class PDFService {
    generateOfferPDF(offer) {
        return (0, offer_renderer_1.renderOfferPDF)(offer);
    }
    generateContractPDF(contract) {
        return (0, contract_renderer_1.renderContractPDF)(contract);
    }
}
exports.pdfService = new PDFService();
