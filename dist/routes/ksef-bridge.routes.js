"use strict";
// src/routes/ksef-bridge.routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const ksef_bridge_controller_1 = require("../controllers/ksef-bridge.controller");
const router = (0, express_1.Router)();
router.get('/preview/:offerId', auth_1.authenticate, ksef_bridge_controller_1.ksefBridgeController.getPreview);
router.post('/send', auth_1.authenticate, ksef_bridge_controller_1.ksefBridgeController.send);
router.post('/webhook', ksef_bridge_controller_1.ksefBridgeController.webhook);
exports.default = router;
