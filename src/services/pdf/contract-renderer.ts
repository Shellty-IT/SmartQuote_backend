// src/services/pdf/contract-renderer.ts
import { PDFContract } from './types';
import { createDoc } from './helpers';
import { contractDocumentRenderer } from './contract-document-renderer';
import { contractSignatureCertificateRenderer } from './contract-signature-renderer';
import { createModuleLogger } from '../../lib/logger';

const logger = createModuleLogger('contract-pdf-renderer');

export class ContractPDFRenderer {
    async render(contract: PDFContract): Promise<Buffer> {
        logger.info({ contractId: contract.id, contractNumber: contract.number }, 'Starting contract PDF rendering');

        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            const doc = createDoc();

            doc.on('data', (chunk: Buffer) => chunks.push(chunk));
            doc.on('end', () => {
                logger.info({ contractId: contract.id, chunks: chunks.length }, 'Contract PDF rendering completed');
                resolve(Buffer.concat(chunks));
            });
            doc.on('error', (err: Error) => {
                logger.error({ err, contractId: contract.id }, 'Contract PDF rendering failed');
                reject(err);
            });

            try {
                contractDocumentRenderer.render(doc, contract);

                if (contract.signatureLog) {
                    contractSignatureCertificateRenderer.render(doc, contract, contract.signatureLog);
                }

                doc.end();
            } catch (err) {
                logger.error({ err, contractId: contract.id }, 'Error during contract PDF rendering');
                reject(err);
            }
        });
    }
}

export const contractPDFRenderer = new ContractPDFRenderer();

export function renderContractPDF(contract: PDFContract): Promise<Buffer> {
    return contractPDFRenderer.render(contract);
}