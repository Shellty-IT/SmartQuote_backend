// smartquote_backend/src/services/ai/core.ts
import { GoogleGenAI } from '@google/genai';
import { config } from '../../config';

export const priorityLabels: Record<string, string> = {
    URGENT: 'Pilny',
    HIGH: 'Wysoki',
    MEDIUM: 'Średni',
    LOW: 'Niski',
};

export const followUpTypeLabels: Record<string, string> = {
    CALL: 'Telefon',
    EMAIL: 'Email',
    MEETING: 'Spotkanie',
    TASK: 'Zadanie',
    REMINDER: 'Przypomnienie',
    OTHER: 'Inne',
};

export const offerStatusLabels: Record<string, string> = {
    DRAFT: 'Szkic',
    SENT: 'Wysłana',
    VIEWED: 'Przejrzana',
    NEGOTIATION: 'Negocjacje',
    ACCEPTED: 'Zaakceptowana',
    REJECTED: 'Odrzucona',
    EXPIRED: 'Wygasła',
};

export type VariantHistoryStats = {
    readonly totalAcceptedOffersAnalyzed: number;
    readonly totalAcceptedWithVariant: number;
    readonly distribution: Array<{ variant: string; count: number; share: number }>;
    readonly topVariant: string | null;
    readonly topVariantShare: number | null;
};

export type SelectedItemSnapshot = {
    readonly itemId: string;
    readonly name: string;
    readonly isSelected: boolean;
    readonly quantity: number;
    readonly unitPrice: number;
    readonly vatRate: number;
    readonly discount: number;
    readonly netto?: number;
    readonly vat?: number;
    readonly brutto?: number;
    readonly variantName?: string | null;
};

export type ClientSelectedSnapshot = {
    readonly selectedVariant: string | null;
    readonly items: SelectedItemSnapshot[];
};

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asNonEmptyStringOrNull(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

export function asNumberOrNull(value: unknown): number | null {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : null;
}

export function parseClientSelectedSnapshot(value: unknown): ClientSelectedSnapshot | null {
    if (!isRecord(value)) return null;

    const selectedVariant = value.selectedVariant === null
        ? null
        : asNonEmptyStringOrNull(value.selectedVariant);
    const itemsValue = value.items;

    if (!Array.isArray(itemsValue)) return null;

    const items: SelectedItemSnapshot[] = [];

    for (const rawItem of itemsValue) {
        if (!isRecord(rawItem)) continue;

        const itemId = asNonEmptyStringOrNull(rawItem.itemId);
        const name = asNonEmptyStringOrNull(rawItem.name);
        const isSelected = typeof rawItem.isSelected === 'boolean' ? rawItem.isSelected : null;
        const quantity = asNumberOrNull(rawItem.quantity);
        const unitPrice = asNumberOrNull(rawItem.unitPrice);
        const vatRate = asNumberOrNull(rawItem.vatRate);
        const discount = asNumberOrNull(rawItem.discount);

        if (
            !itemId || !name || isSelected === null ||
            quantity === null || unitPrice === null ||
            vatRate === null || discount === null
        ) {
            continue;
        }

        items.push({
            itemId,
            name,
            isSelected,
            quantity,
            unitPrice,
            vatRate,
            discount,
            netto: asNumberOrNull(rawItem.netto) ?? undefined,
            vat: asNumberOrNull(rawItem.vat) ?? undefined,
            brutto: asNumberOrNull(rawItem.brutto) ?? undefined,
            variantName: rawItem.variantName === null
                ? null
                : asNonEmptyStringOrNull(rawItem.variantName),
        });
    }

    return { selectedVariant, items };
}

export function inferSelectedVariantFromInteractions(
    interactions: Array<{ type: string; details: unknown }>
): string | null | undefined {
    for (let idx = interactions.length - 1; idx >= 0; idx -= 1) {
        const i = interactions[idx];
        if (!i) continue;
        if (i.type !== 'ITEM_SELECT' && i.type !== 'ACCEPT') continue;
        if (!isRecord(i.details)) continue;
        const sv = i.details.selectedVariant;
        if (sv === null) return null;
        const parsed = asNonEmptyStringOrNull(sv);
        if (parsed) return parsed;
    }
    return undefined;
}

export function initAI(): GoogleGenAI | null {
    if (config.gemini.apiKey) {
        console.log('✅ AI Service initialized with model:', config.gemini.model);
        return new GoogleGenAI({ apiKey: config.gemini.apiKey });
    }
    console.warn('⚠️ GEMINI_API_KEY not configured. AI features will be disabled.');
    return null;
}

export function safeJsonParse(str: string): Record<string, unknown> {
    try {
        return JSON.parse(str);
    } catch {
        return {};
    }
}

export function extractJson(text: string): unknown | null {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
        return JSON.parse(match[0]);
    } catch {
        return null;
    }
}

export async function callGemini(ai: GoogleGenAI, prompt: string): Promise<string> {
    const response = await ai.models.generateContent({
        model: config.gemini.model,
        contents: prompt,
    });
    return response.text || '';
}