// smartquote_backend/src/services/shared/postmortem.utils.ts
import { aiService } from '../ai/index';

export function triggerPostMortem(
    userId: string,
    offerId: string,
    outcome: 'ACCEPTED' | 'REJECTED',
    source: string = 'unknown'
): void {
    aiService.generatePostMortem(userId, offerId, outcome)
        .then(() => {
            console.log(`✅ Post-mortem generated for offer ${offerId} [${outcome}] (${source})`);
        })
        .catch((err: unknown) => {
            console.error(`❌ Post-mortem failed for offer ${offerId}:`, err);
        });
}