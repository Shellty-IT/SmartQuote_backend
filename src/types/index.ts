// smartquote_backend/src/types/index.ts

import { Request } from 'express';
import {
    FollowUpType,
    FollowUpStatus,
    Priority
} from '@prisma/client';

// Rozszerzenie Express Request o user (globalne)
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                name?: string | null;
                role: string;
            };
        }
    }
}

// Eksportowany typ do użycia w kontrolerach
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        name?: string | null;
        role: string;
    };
}

// ============================================
// Typy dla paginacji i zapytań
// ============================================
export interface PaginationQuery {
    page?: string;
    limit?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

// ============================================
// Typy dla Client
// ============================================
export interface CreateClientInput {
    type?: 'PERSON' | 'COMPANY';
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    nip?: string;
    regon?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    website?: string;
    notes?: string;
}

export interface UpdateClientInput {
    type?: 'PERSON' | 'COMPANY';
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    nip?: string;
    regon?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    website?: string;
    notes?: string;
    isActive?: boolean;
}

// ============================================
// Typy dla Offer
// ============================================
export interface OfferItemInput {
    name: string;
    description?: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    vatRate?: number;
    discount?: number;
}

export interface CreateOfferInput {
    title: string;
    description?: string;
    clientId: string;
    validUntil?: Date | string;
    notes?: string;
    terms?: string;
    paymentDays?: number;
    items: OfferItemInput[];
}

export interface UpdateOfferInput {
    title?: string;
    description?: string;
    status?: 'DRAFT' | 'SENT' | 'VIEWED' | 'NEGOTIATION' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
    validUntil?: Date | string;
    notes?: string;
    terms?: string;
    paymentDays?: number;
    items?: OfferItemInput[];
}

// ============================================
// Typy dla Contract
// ============================================
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

// ============================================
// Typy dla Follow-up - re-eksport z Prisma
// ============================================
export type FollowUpTypeValue = FollowUpType;
export type FollowUpStatusValue = FollowUpStatus;
export type PriorityValue = Priority;

// Stałe dla walidacji - muszą być zgodne z Prisma enum
export const FOLLOW_UP_TYPES: FollowUpType[] = ['CALL', 'EMAIL', 'MEETING', 'TASK', 'REMINDER', 'OTHER'];
export const FOLLOW_UP_STATUSES: FollowUpStatus[] = ['PENDING', 'COMPLETED', 'CANCELLED', 'OVERDUE'];
export const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export interface FollowUpQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: FollowUpStatus;
    type?: FollowUpType;
    priority?: Priority;
    clientId?: string;
    offerId?: string;
    contractId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    overdue?: boolean;
    upcoming?: number;
}

export interface CreateFollowUpInput {
    title: string;
    description?: string;
    type: FollowUpType;
    priority?: Priority;
    dueDate: Date | string;
    clientId?: string;
    offerId?: string;
    contractId?: string;
    notes?: string;
}

export interface UpdateFollowUpInput {
    title?: string;
    description?: string;
    type?: FollowUpType;
    status?: FollowUpStatus;
    priority?: Priority;
    dueDate?: Date | string;
    clientId?: string;
    offerId?: string;
    contractId?: string;
    notes?: string;
    completedAt?: Date | string;
}

// ============================================
// Typy dla AI
// ============================================
export interface AIMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: Date;
}

export interface AIStats {
    totalClients: number;
    activeOffers: number;
    pendingFollowUps: number;
    monthlyRevenue: number;
}

export interface AIContext {
    userId: string;
    clients?: any[];
    offers?: any[];
    contracts?: any[];
    followUps?: any[];
    stats?: AIStats;
}

export interface AIAction {
    type: 'create_offer' | 'create_followup' | 'send_email' | 'view_client' | 'view_offer' | 'navigate';
    label: string;
    payload: any;
}

export interface AIResponse {
    message: string;
    suggestions?: string[];
    actions?: AIAction[];
    data?: any;
}

export interface AISuggestion {
    type: 'warning' | 'info' | 'tip' | 'success';
    title: string;
    message: string;
    action?: {
        type: 'navigate' | 'ai_prompt';
        path?: string;
        prompt?: string;
    };
}

export interface GeneratedOffer {
    title: string;
    items: {
        name: string;
        description?: string;
        quantity: number;
        unit: string;
        unitPrice: number;
        vatRate: number;
    }[];
    notes?: string;
    validDays: number;
}

export interface ClientAnalysis {
    score: number;
    potential: 'wysoki' | 'średni' | 'niski';
    summary: string;
    recommendations: string[];
    nextAction: string;
    risks: string[];
}

export interface EmailGenerationContext {
    clientName: string;
    offerTitle?: string;
    customContext?: string;
}

export type EmailType = 'offer_send' | 'followup' | 'thank_you' | 'reminder';