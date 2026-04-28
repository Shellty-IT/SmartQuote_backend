// src/services/ai/ai-types.ts
export interface PriceInsightAISuggestion {
    readonly suggestedMin: number;
    readonly suggestedMax: number;
    readonly marketAnalysis: string;
    readonly marginWarning: string | null;
    readonly confidence: 'low' | 'medium' | 'high';
}

export interface PriceInsightHistoricalItem {
    readonly name: string;
    readonly unitPrice: number;
    readonly quantity: number;
    readonly unit: string;
    readonly offerTitle: string;
    readonly offerStatus: string;
    readonly clientName: string;
    readonly date: string;
}

export interface PriceInsightResult {
    readonly historicalData: {
        readonly avgPrice: number;
        readonly minPrice: number;
        readonly maxPrice: number;
        readonly count: number;
        readonly items: PriceInsightHistoricalItem[];
    };
    readonly aiSuggestion: PriceInsightAISuggestion;
}

export interface TimeAnalysis {
    readonly totalViews: number;
    readonly avgViewDuration: number | null;
    readonly mostActiveTime: string | null;
}

export interface ObserverResult {
    readonly summary: string;
    readonly keyFindings: string[];
    readonly clientIntent: 'likely_accept' | 'undecided' | 'likely_reject' | 'unknown';
    readonly interestAreas: string[];
    readonly concerns: string[];
    readonly engagementScore: number;
    readonly timeAnalysis: TimeAnalysis;
}

export interface ClosingStrategyResult {
    readonly aggressive: {
        readonly title: string;
        readonly description: string;
        readonly suggestedResponse: string;
        readonly riskLevel: 'low' | 'medium' | 'high';
    };
    readonly partnership: {
        readonly title: string;
        readonly description: string;
        readonly suggestedResponse: string;
        readonly proposedConcessions: string[];
    };
    readonly quickClose: {
        readonly title: string;
        readonly description: string;
        readonly suggestedResponse: string;
        readonly maxDiscountPercent: number;
    };
    readonly contextSummary: string;
}

export interface ObserverContext {
    summary: string;
    clientIntent: string;
    concerns: string[];
    engagementScore: number;
}