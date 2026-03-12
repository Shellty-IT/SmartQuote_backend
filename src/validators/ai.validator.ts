// smartquote_backend/src/validators/ai.validator.ts
import { z } from 'zod';

export const chatSchema = z.object({
    body: z.object({
        message: z.string().min(1, 'Wiadomość jest wymagana').max(2000),
        history: z.array(
            z.object({
                role: z.enum(['user', 'assistant']),
                content: z.string(),
                timestamp: z.string().or(z.date()).optional(),
            })
        ).optional().default([]),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
});

export const generateOfferSchema = z.object({
    body: z.object({
        description: z.string().min(10, 'Opis musi mieć minimum 10 znaków').max(2000),
        clientId: z.string().uuid().optional(),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
});

export const generateEmailSchema = z.object({
    body: z.object({
        type: z.enum(['offer_send', 'followup', 'thank_you', 'reminder']),
        clientName: z.string().min(1),
        offerTitle: z.string().optional(),
        customContext: z.string().max(500).optional(),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
});

export const analyzeClientSchema = z.object({
    body: z.object({}).optional(),
    query: z.object({}).optional(),
    params: z.object({
        clientId: z.string().uuid(),
    }),
});

export const priceInsightSchema = z.object({
    body: z.object({
        itemName: z.string().min(2, 'Nazwa pozycji musi mieć minimum 2 znaki').max(200),
        category: z.string().max(100).optional(),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
});

export const observerInsightSchema = z.object({
    body: z.object({}).optional(),
    query: z.object({}).optional(),
    params: z.object({
        offerId: z.string().min(1, 'ID oferty jest wymagane'),
    }),
});

export const closingStrategySchema = z.object({
    body: z.object({}).optional(),
    query: z.object({}).optional(),
    params: z.object({
        offerId: z.string().min(1, 'ID oferty jest wymagane'),
    }),
});

export const latestInsightsSchema = z.object({
    body: z.object({}).optional(),
    query: z.object({
        limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(20)).optional(),
    }).optional(),
    params: z.object({}).optional(),
});