// src/types/index.ts
import { Request } from 'express';
import {
    FollowUpType,
    FollowUpStatus,
    Priority,
} from '@prisma/client';

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

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        name?: string | null;
        role: string;
    };
}

export interface PaginationQuery {
    page?: string;
    limit?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

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

export interface OfferItemInput {
    name: string;
    description?: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    vatRate?: number;
    discount?: number;
    isOptional?: boolean;
    minQuantity?: number;
    maxQuantity?: number;
    variantName?: string;
}

export interface CreateOfferInput {
    title: string;
    description?: string;
    clientId: string;
    validUntil?: Date | string;
    notes?: string;
    terms?: string;
    paymentDays?: number;
    requireAuditTrail?: boolean;
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
    requireAuditTrail?: boolean;
    items?: OfferItemInput[];
}

export interface PublicOfferAcceptInput {
    confirmationChecked: boolean;
    selectedVariant?: string;
    clientName?: string;
    clientEmail?: string;
    selectedItems: Array<{
        id: string;
        isSelected: boolean;
        quantity: number;
    }>;
}

export interface PublicOfferRejectInput {
    reason?: string;
}

export interface PublicOfferCommentInput {
    content: string;
}

export interface PublicOfferSelectionInput {
    items: Array<{
        id: string;
        isSelected: boolean;
        quantity: number;
    }>;
}

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

export type FollowUpTypeValue = FollowUpType;
export type FollowUpStatusValue = FollowUpStatus;
export type PriorityValue = Priority;

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

export interface AIContextClient {
    id: string;
    name: string;
    company: string | null;
    email: string | null;
    type: string;
    isActive: boolean;
}

export interface AIContextOffer {
    id: string;
    number: string;
    title: string;
    status: string;
    totalGross: unknown;
    validUntil: Date | null;
    client: { name: string; company: string | null } | null;
}

export interface AIContextContract {
    id: string;
    number: string;
    title: string;
    status: string;
    totalGross: unknown;
    client: { name: string; company: string | null } | null;
}

export interface AIContextFollowUp {
    id: string;
    title: string;
    type: string;
    status: string;
    priority: string;
    dueDate: Date;
    client: { name: string } | null;
}

export interface AIContext {
    userId: string;
    clients?: AIContextClient[];
    offers?: AIContextOffer[];
    contracts?: AIContextContract[];
    followUps?: AIContextFollowUp[];
    stats?: AIStats;
}

export interface AIAction {
    type: 'create_offer' | 'create_followup' | 'send_email' | 'view_client' | 'view_offer' | 'navigate';
    label: string;
    payload: Record<string, unknown>;
}

export interface AIResponse {
    message: string;
    suggestions?: string[];
    actions?: AIAction[];
    data?: Record<string, unknown>;
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
    potential: 'wysoki' | 'sredni' | 'niski';
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

export interface SmtpConfig {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
    replyTo?: string;
}

export type EmailLogStatus = 'SENT' | 'FAILED' | 'DRAFT';

export interface SendEmailInput {
    to: string;
    toName?: string;
    subject: string;
    body: string;
    clientId?: string;
    offerId?: string;
    contractId?: string;
    templateId?: string;
    templateName?: string;
    attachments?: EmailAttachment[];
    saveAsDraft?: boolean;
}

export interface UpdateDraftInput {
    to?: string;
    toName?: string;
    subject?: string;
    body?: string;
    clientId?: string;
    offerId?: string;
    contractId?: string;
    templateId?: string;
    templateName?: string;
    attachments?: EmailAttachment[];
}

export interface EmailAttachment {
    type: 'offer_pdf' | 'contract_pdf' | 'offer_link' | 'contract_link';
    resourceId: string;
    name: string;
}

export interface CreateEmailTemplateInput {
    name: string;
    subject: string;
    body: string;
}

export interface UpdateEmailTemplateInput {
    name?: string;
    subject?: string;
    body?: string;
}

export interface GetEmailLogsParams {
    userId: string;
    page?: number;
    limit?: number;
    status?: EmailLogStatus;
    clientId?: string;
    offerId?: string;
    contractId?: string;
    search?: string;
}