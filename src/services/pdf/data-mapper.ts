// smartquote_backend/src/services/pdf/data-mapper.ts
import { PDFUser, PDFClient } from './types';

export interface UserWithCompany {
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

export interface ClientRaw {
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

export function mapToPDFUser(user: UserWithCompany): PDFUser {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.companyInfo?.phone || user.phone,
        company: user.companyInfo?.name || null,
    };
}

export function mapToPDFClient(client: ClientRaw): PDFClient {
    return {
        id: client.id,
        type: client.type,
        name: client.name,
        email: client.email,
        phone: client.phone,
        company: client.company,
        nip: client.nip,
        address: client.address,
        city: client.city,
        postalCode: client.postalCode,
    };
}