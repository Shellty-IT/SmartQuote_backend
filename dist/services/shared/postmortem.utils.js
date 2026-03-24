"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerPostMortem = triggerPostMortem;
// smartquote_backend/src/services/shared/postmortem.utils.ts
const index_1 = require("../ai/index");
function triggerPostMortem(userId, offerId, outcome, source = 'unknown') {
    index_1.aiService.generatePostMortem(userId, offerId, outcome)
        .then(() => {
        console.log(`✅ Post-mortem generated for offer ${offerId} [${outcome}] (${source})`);
    })
        .catch((err) => {
        console.error(`❌ Post-mortem failed for offer ${offerId}:`, err);
    });
}
