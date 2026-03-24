"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.offerStatusLabels = exports.followUpTypeLabels = exports.priorityLabels = void 0;
exports.isRecord = isRecord;
exports.asNonEmptyStringOrNull = asNonEmptyStringOrNull;
exports.asNumberOrNull = asNumberOrNull;
exports.parseClientSelectedSnapshot = parseClientSelectedSnapshot;
exports.inferSelectedVariantFromInteractions = inferSelectedVariantFromInteractions;
exports.initAI = initAI;
exports.safeJsonParse = safeJsonParse;
exports.extractJson = extractJson;
exports.callGemini = callGemini;
// smartquote_backend/src/services/ai/core.ts
const genai_1 = require("@google/genai");
const config_1 = require("../../config");
exports.priorityLabels = {
    URGENT: 'Pilny',
    HIGH: 'Wysoki',
    MEDIUM: 'Średni',
    LOW: 'Niski',
};
exports.followUpTypeLabels = {
    CALL: 'Telefon',
    EMAIL: 'Email',
    MEETING: 'Spotkanie',
    TASK: 'Zadanie',
    REMINDER: 'Przypomnienie',
    OTHER: 'Inne',
};
exports.offerStatusLabels = {
    DRAFT: 'Szkic',
    SENT: 'Wysłana',
    VIEWED: 'Przejrzana',
    NEGOTIATION: 'Negocjacje',
    ACCEPTED: 'Zaakceptowana',
    REJECTED: 'Odrzucona',
    EXPIRED: 'Wygasła',
};
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function asNonEmptyStringOrNull(value) {
    if (typeof value !== 'string')
        return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}
function asNumberOrNull(value) {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : null;
}
function parseClientSelectedSnapshot(value) {
    if (!isRecord(value))
        return null;
    const selectedVariant = value.selectedVariant === null
        ? null
        : asNonEmptyStringOrNull(value.selectedVariant);
    const itemsValue = value.items;
    if (!Array.isArray(itemsValue))
        return null;
    const items = [];
    for (const rawItem of itemsValue) {
        if (!isRecord(rawItem))
            continue;
        const itemId = asNonEmptyStringOrNull(rawItem.itemId);
        const name = asNonEmptyStringOrNull(rawItem.name);
        const isSelected = typeof rawItem.isSelected === 'boolean' ? rawItem.isSelected : null;
        const quantity = asNumberOrNull(rawItem.quantity);
        const unitPrice = asNumberOrNull(rawItem.unitPrice);
        const vatRate = asNumberOrNull(rawItem.vatRate);
        const discount = asNumberOrNull(rawItem.discount);
        if (!itemId || !name || isSelected === null ||
            quantity === null || unitPrice === null ||
            vatRate === null || discount === null) {
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
function inferSelectedVariantFromInteractions(interactions) {
    for (let idx = interactions.length - 1; idx >= 0; idx -= 1) {
        const i = interactions[idx];
        if (!i)
            continue;
        if (i.type !== 'ITEM_SELECT' && i.type !== 'ACCEPT')
            continue;
        if (!isRecord(i.details))
            continue;
        const sv = i.details.selectedVariant;
        if (sv === null)
            return null;
        const parsed = asNonEmptyStringOrNull(sv);
        if (parsed)
            return parsed;
    }
    return undefined;
}
function initAI() {
    if (config_1.config.gemini.apiKey) {
        console.log('✅ AI Service initialized with model:', config_1.config.gemini.model);
        return new genai_1.GoogleGenAI({ apiKey: config_1.config.gemini.apiKey });
    }
    console.warn('⚠️ GEMINI_API_KEY not configured. AI features will be disabled.');
    return null;
}
function safeJsonParse(str) {
    try {
        return JSON.parse(str);
    }
    catch {
        return {};
    }
}
function extractJson(text) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match)
        return null;
    try {
        return JSON.parse(match[0]);
    }
    catch {
        return null;
    }
}
async function callGemini(ai, prompt) {
    const response = await ai.models.generateContent({
        model: config_1.config.gemini.model,
        contents: prompt,
    });
    return response.text || '';
}
