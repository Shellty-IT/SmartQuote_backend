// src/services/pdf/types.ts
import { Decimal } from '@prisma/client/runtime/library';

export interface PDFClient {
    id: string;
    type: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    nip: string | null;
    address: string | null;
    city: string | null;
    postalCode: string | null;
}

export interface PDFOfferItem {
    id: string;
    name: string;
    description: string | null;
    quantity: Decimal;
    unit: string;
    unitPrice: Decimal;
    vatRate: Decimal;
    discount: Decimal;
    totalNet: Decimal;
    totalVat: Decimal;
    totalGross: Decimal;
    variantName: string | null;
}

export interface PDFContractItem {
    id: string;
    name: string;
    description: string | null;
    quantity: Decimal;
    unit: string;
    unitPrice: Decimal;
    vatRate: Decimal;
    discount: Decimal;
    totalNet: Decimal;
    totalVat: Decimal;
    totalGross: Decimal;
}

export interface PDFUser {
    id: string;
    email: string;
    name: string | null;
    company: string | null;
    phone: string | null;
}

export interface PDFAcceptanceLog {
    ipAddress: string;
    userAgent: string;
    acceptedAt: Date;
    contentHash: string;
    clientName: string | null;
    clientEmail: string | null;
    selectedVariant: string | null;
    totalNet: Decimal;
    totalVat: Decimal;
    totalGross: Decimal;
    currency: string;
}

export interface PDFSignatureLog {
    ipAddress: string;
    userAgent: string;
    signedAt: Date;
    contentHash: string;
    signatureImage: string;
    signerName: string;
    signerEmail: string;
    totalNet: Decimal;
    totalVat: Decimal;
    totalGross: Decimal;
    currency: string;
}

export interface PDFOffer {
    id: string;
    number: string;
    title: string;
    description: string | null;
    status: string;
    totalNet: Decimal;
    totalVat: Decimal;
    totalGross: Decimal;
    currency: string;
    validUntil: Date | null;
    notes: string | null;
    terms: string | null;
    paymentDays: number;
    createdAt: Date;
    client: PDFClient;
    items: PDFOfferItem[];
    user: PDFUser;
    acceptanceLog?: PDFAcceptanceLog | null;
}

export interface PDFContract {
    id: string;
    number: string;
    title: string;
    description: string | null;
    status: string;
    totalNet: Decimal;
    totalVat: Decimal;
    totalGross: Decimal;
    currency: string;
    startDate: Date | null;
    endDate: Date | null;
    signedAt: Date | null;
    terms: string | null;
    paymentTerms: string | null;
    paymentDays: number;
    notes: string | null;
    createdAt: Date;
    client: PDFClient;
    items: PDFContractItem[];
    user: PDFUser;
    signatureLog?: PDFSignatureLog;
}

export interface VariantGroup {
    name: string | null;
    items: PDFOfferItem[];
    totalNet: Decimal;
    totalVat: Decimal;
    totalGross: Decimal;
}

