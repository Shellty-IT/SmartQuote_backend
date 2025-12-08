// smartquote_backend/src/types/index.ts

import { Request } from 'express';

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
// Typy dla Follow-up
// ============================================
export type FollowUpTypeValue = 'CALL' | 'EMAIL' | 'MEETING' | 'TASK' | 'REMINDER' | 'OTHER';
export type FollowUpStatusValue = 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';
export type PriorityValue = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

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