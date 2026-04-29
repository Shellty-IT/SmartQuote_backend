// src/services/email/email-attachment-resolver.ts
import nodemailer from 'nodemailer';
import { pdfService } from '../pdf/index';
import { mapToPDFUser, mapToPDFClient } from '../pdf/data-mapper';
import { offersRepository } from '../../repositories/offers.repository';
import { contractsRepository } from '../../repositories/contracts.repository';
import { emailComposerRepository } from '../../repositories/email-composer.repository';
import { NotFoundError } from '../../errors/domain.errors';
import type { EmailAttachment } from '../../types';

interface AttachmentBuffer {
    filename: string;
    content: Buffer;
    contentType: string;
}

interface UserForPDF {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    companyInfo: {
        name: string | null;
        nip: string | null;
        address: string | null;
        city: string | null;
        postalCode: string | null;
        phone: string | null;
        email: string | null;
        website?: string | null;
        logo?: string | null;
    } | null;
}

async function generateOfferPDFBuffer(offerId: string, userId: string): Promise<AttachmentBuffer> {
    const offer = await offersRepository.findByIdForPDFAttachment(offerId, userId);
    if (!offer) throw new NotFoundError('Oferta');

    const userForPDF: UserForPDF = {
        id: offer.user.id,
        email: offer.user.email,
        name: offer.user.name,
        phone: offer.user.phone,
        companyInfo: offer.user.companyInfo,
    };

    const pdfBuffer = await pdfService.generateOfferPDF({
        ...offer,
        user: mapToPDFUser(userForPDF),
        client: mapToPDFClient(offer.client),
        acceptanceLog: null,
    } as Parameters<typeof pdfService.generateOfferPDF>[0]);

    return {
        filename: `Oferta_${offer.number.replace(/\//g, '-')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
    };
}

async function generateContractPDFBuffer(contractId: string, userId: string): Promise<AttachmentBuffer> {
    const contract = await contractsRepository.findByIdForPDFAttachment(contractId, userId);
    if (!contract) throw new NotFoundError('Kontrakt');

    const userForPDF: UserForPDF = {
        id: contract.user.id,
        email: contract.user.email,
        name: contract.user.name,
        phone: contract.user.phone,
        companyInfo: contract.user.companyInfo,
    };

    const pdfBuffer = await pdfService.generateContractPDF({
        ...contract,
        user: mapToPDFUser(userForPDF),
        client: mapToPDFClient(contract.client),
        signatureLog: undefined,
    } as Parameters<typeof pdfService.generateContractPDF>[0]);

    return {
        filename: `Umowa_${contract.number.replace(/\//g, '-')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
    };
}

export async function resolveAttachments(
    attachments: EmailAttachment[],
    userId: string,
    frontendUrl: string,
): Promise<{
    nodemailerAttachments: nodemailer.SendMailOptions['attachments'];
    linkLines: string[];
}> {
    const nodemailerAttachments: nodemailer.SendMailOptions['attachments'] = [];
    const linkLines: string[] = [];

    for (const att of attachments) {
        if (att.type === 'offer_pdf') {
            const buf = await generateOfferPDFBuffer(att.resourceId, userId);
            nodemailerAttachments.push({
                filename: buf.filename,
                content: buf.content,
                contentType: buf.contentType,
            });
        } else if (att.type === 'contract_pdf') {
            const buf = await generateContractPDFBuffer(att.resourceId, userId);
            nodemailerAttachments.push({
                filename: buf.filename,
                content: buf.content,
                contentType: buf.contentType,
            });
        } else if (att.type === 'offer_link') {
            const offer = await emailComposerRepository.findOfferPublicToken(att.resourceId, userId);
            if (offer?.publicToken) {
                linkLines.push(`Oferta ${offer.number}: ${frontendUrl}/offer/view/${offer.publicToken}`);
            }
        } else if (att.type === 'contract_link') {
            const contract = await emailComposerRepository.findContractPublicToken(att.resourceId, userId);
            if (contract?.publicToken) {
                linkLines.push(`Umowa ${contract.number}: ${frontendUrl}/contract/view/${contract.publicToken}`);
            }
        }
    }

    return { nodemailerAttachments, linkLines };
}