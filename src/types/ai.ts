// SmartQuote-AI/src/types/ai.ts

export interface ChatData {
    message: string;
    suggestions?: string[];
    actions?: Array<{
        type: 'create_offer' | 'create_followup' | 'send_email' | 'view_client' | 'view_offer' | 'navigate';
        label: string;
        payload: any;
    }>;
}

export interface SuggestionsData {
    suggestions: Array<{
        type: 'warning' | 'info' | 'tip' | 'success';
        title: string;
        message: string;
        action?: {
            type: 'navigate' | 'ai_prompt';
            path?: string;
            prompt?: string;
        };
    }>;
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

export interface PriceInsightResult {
    suggestedMin: number;
    suggestedMax: number;
    marketAnalysis: string;
    marginWarning: string | null;
    confidence: 'low' | 'medium' | 'high';
    historicalData?: {
        avgPrice: number;
        minPrice: number;
        maxPrice: number;
        sampleSize: number;
    };
}

export interface ObserverInsight {
    summary: string;
    keyFindings: string[];
    clientIntent: 'likely_accept' | 'undecided' | 'likely_reject' | 'unknown';
    interestAreas: string[];
    concerns: string[];
    engagementScore: number;
    timeAnalysis: {
        totalViews: number;
        avgViewDuration: number | null;
        mostActiveTime: string | null;
    };
}

export interface ClosingStrategy {
    contextSummary: string;
    aggressive: {
        title: string;
        description: string;
        suggestedResponse: string;
        riskLevel: 'low' | 'medium' | 'high';
    };
    partnership: {
        title: string;
        description: string;
        suggestedResponse: string;
        proposedConcessions: string[];
    };
    quickClose: {
        title: string;
        description: string;
        suggestedResponse: string;
        maxDiscountPercent: number;
    };
}

export interface PostMortemInsight {
    summary: string;
    keyLessons: string[];
    pricingInsight: string;
    improvementSuggestions: string[];
    industryNote: string;
}