"use strict";
// src/routes/followups.routes.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const followups_controller_1 = __importDefault(require("../controllers/followups.controller"));
const validate_1 = require("../middleware/validate");
const auth_1 = require("../middleware/auth");
const followups_validator_1 = require("../validators/followups.validator");
const router = (0, express_1.Router)();
// Wszystkie trasy wymagają autoryzacji
router.use(auth_1.authenticate);
// Helper do obsługi async/await z typami
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
// Statystyki i specjalne endpointy (przed /:id)
router.get('/stats', asyncHandler(followups_controller_1.default.getStats));
router.get('/upcoming', asyncHandler(followups_controller_1.default.getUpcoming));
router.get('/overdue', asyncHandler(followups_controller_1.default.getOverdue));
// Bulk operations
router.delete('/bulk', asyncHandler(followups_controller_1.default.deleteMany));
// Powiązane z encjami
router.get('/client/:clientId', asyncHandler(followups_controller_1.default.getByClient));
router.get('/offer/:offerId', asyncHandler(followups_controller_1.default.getByOffer));
router.get('/contract/:contractId', asyncHandler(followups_controller_1.default.getByContract));
// Admin/CRON
router.post('/mark-overdue', asyncHandler(followups_controller_1.default.markOverdue));
// CRUD
router.get('/', asyncHandler(followups_controller_1.default.getAll));
router.get('/:id', asyncHandler(followups_controller_1.default.getById));
router.post('/', (0, validate_1.validate)(followups_validator_1.createFollowUpSchema), asyncHandler(followups_controller_1.default.create));
router.put('/:id', (0, validate_1.validate)(followups_validator_1.updateFollowUpSchema), asyncHandler(followups_controller_1.default.update));
router.delete('/:id', asyncHandler(followups_controller_1.default.delete));
// Status operations
router.patch('/:id/status', (0, validate_1.validate)(followups_validator_1.updateStatusSchema), asyncHandler(followups_controller_1.default.updateStatus));
router.patch('/:id/complete', asyncHandler(followups_controller_1.default.complete));
exports.default = router;
