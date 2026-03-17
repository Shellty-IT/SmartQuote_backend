"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// smartquote_backend/src/routes/index.ts
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const publicOffer_routes_1 = __importDefault(require("./publicOffer.routes"));
const publicContract_routes_1 = __importDefault(require("./publicContract.routes"));
const clients_routes_1 = __importDefault(require("./clients.routes"));
const offers_routes_1 = __importDefault(require("./offers.routes"));
const contracts_routes_1 = __importDefault(require("./contracts.routes"));
const followups_routes_1 = __importDefault(require("./followups.routes"));
const ai_routes_1 = __importDefault(require("./ai.routes"));
const settings_routes_1 = __importDefault(require("./settings.routes"));
const notifications_routes_1 = __importDefault(require("./notifications.routes"));
const router = (0, express_1.Router)();
router.use('/auth', auth_routes_1.default);
router.use('/public/offers', publicOffer_routes_1.default);
router.use('/public/contracts', publicContract_routes_1.default);
router.use('/clients', clients_routes_1.default);
router.use('/offers', offers_routes_1.default);
router.use('/contracts', contracts_routes_1.default);
router.use('/followups', followups_routes_1.default);
router.use('/ai', ai_routes_1.default);
router.use('/settings', settings_routes_1.default);
router.use('/notifications', notifications_routes_1.default);
router.get('/health', (req, res) => {
    res.json({ success: true, data: { status: 'healthy', timestamp: new Date().toISOString() } });
});
exports.default = router;
