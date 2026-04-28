// src/services/ai/parsers.ts
export function parseConfidence(value: unknown): 'low' | 'medium' | 'high' {
    return (['low', 'medium', 'high'] as const).includes(value as 'low' | 'medium' | 'high')
        ? (value as 'low' | 'medium' | 'high')
        : 'low';
}

export function parseClientIntent(
    value: unknown,
): 'likely_accept' | 'undecided' | 'likely_reject' | 'unknown' {
    const valid = ['likely_accept', 'undecided', 'likely_reject', 'unknown'] as const;
    return valid.includes(value as typeof valid[number]) ? (value as typeof valid[number]) : 'unknown';
}

export function parseRiskLevel(value: unknown): 'low' | 'medium' | 'high' {
    return (['low', 'medium', 'high'] as const).includes(value as 'low' | 'medium' | 'high')
        ? (value as 'low' | 'medium' | 'high')
        : 'medium';
}

export function parseStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.map(String) : [];
}

export function parseNumber(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return isNaN(parsed) ? fallback : parsed;
}

export function computeAvgPrice(prices: number[]): number {
    if (prices.length === 0) return 0;
    return Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100;
}