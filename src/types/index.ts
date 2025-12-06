// smartquote_backend/src/types/index.ts

import { Request } from 'express';

// Rozszerzenie Express Request o user
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        name: string | null;
        role: string;
    };
}

// Typy dla Contract
export interface ContractItemInput {
    name: string;
    description?: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    vatRate?: number;
    discount?: number;
    position?: number;
}

export interface CreateContractInput {
    title: string;
    description?: string;
    clientId: string;
    offerId?: string;
    startDate?: Date | string;
    endDate?: Date | string;
    terms?: string;
    paymentTerms?: string;
    paymentDays?: number;
    notes?: string;
    items: ContractItemInput[];
}

export interface UpdateContractInput {
    title?: string;
    description?: string;
    status?: 'DRAFT' | 'PENDING_SIGNATURE' | 'ACTIVE' | 'COMPLETED' | 'TERMINATED' | 'EXPIRED';
    startDate?: Date | string;
    endDate?: Date | string;
    signedAt?: Date | string;
    terms?: string;
    paymentTerms?: string;
    paymentDays?: number;
    notes?: string;
    items?: ContractItemInput[];
}

export interface GetContractsParams {
    userId: string;
    page?: number;
    limit?: number;
    status?: 'DRAFT' | 'PENDING_SIGNATURE' | 'ACTIVE' | 'COMPLETED' | 'TERMINATED' | 'EXPIRED';
    clientId?: string;
    search?: string;
}

// Typy dla Follow-up
export type FollowUpTypeValue = 'CALL' | 'EMAIL' | 'MEETING' | 'TASK' | 'REMINDER' | 'OTHER';
export type FollowUpStatusValue = 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';
export type PriorityValue = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';