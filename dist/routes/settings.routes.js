"use strict";
// smartquote_backend/src/routes/settings.routes.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const settingsController = __importStar(require("../controllers/settings.controller"));
const v = __importStar(require("../validators/settings.validator"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', settingsController.getAllSettings);
router.get('/profile', settingsController.getProfile);
router.put('/profile', (0, validate_1.validate)(v.updateProfileSchema), settingsController.updateProfile);
router.put('/password', (0, validate_1.validate)(v.changePasswordSchema), settingsController.changePassword);
router.get('/preferences', settingsController.getSettings);
router.put('/preferences', (0, validate_1.validate)(v.updateSettingsSchema), settingsController.updateSettings);
router.get('/company', settingsController.getCompanyInfo);
router.put('/company', (0, validate_1.validate)(v.updateCompanyInfoSchema), settingsController.updateCompanyInfo);
router.get('/api-keys', settingsController.getApiKeys);
router.post('/api-keys', (0, validate_1.validate)(v.createApiKeySchema), settingsController.createApiKey);
router.patch('/api-keys/:id/toggle', settingsController.toggleApiKey);
router.delete('/api-keys/:id', settingsController.deleteApiKey);
router.get('/smtp', settingsController.getSmtpConfig);
router.put('/smtp', (0, validate_1.validate)(v.updateSmtpConfigSchema), settingsController.updateSmtpConfig);
router.delete('/smtp', settingsController.deleteSmtpConfig);
router.post('/smtp/test', (0, validate_1.validate)(v.testSmtpConnectionSchema), settingsController.testSmtpConnection);
exports.default = router;
