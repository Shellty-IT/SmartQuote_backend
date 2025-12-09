"use strict";
// smartquote_backend/src/routes/contracts.routes.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const contracts_controller_1 = __importDefault(require("../controllers/contracts.controller"));
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const contracts_validator_1 = require("../validators/contracts.validator");
const router = (0, express_1.Router)();
// Wszystkie routes wymagają autoryzacji
router.use(auth_1.authenticate);
// GET /api/contracts
router.get('/', contracts_controller_1.default.getContracts);
// GET /api/contracts/stats
router.get('/stats', contracts_controller_1.default.getContractsStats);
// GET /api/contracts/:id/pdf - WAŻNE: przed /:id żeby nie było konfliktu
router.get('/:id/pdf', contracts_controller_1.default.generateContractPDF);
// GET /api/contracts/:id
router.get('/:id', contracts_controller_1.default.getContractById);
// POST /api/contracts
router.post('/', (0, validate_1.validate)(contracts_validator_1.createContractSchema), contracts_controller_1.default.createContract);
// POST /api/contracts/from-offer/:offerId
router.post('/from-offer/:offerId', contracts_controller_1.default.createContractFromOffer);
// PUT /api/contracts/:id
router.put('/:id', (0, validate_1.validate)(contracts_validator_1.updateContractSchema), contracts_controller_1.default.updateContract);
// PUT /api/contracts/:id/status
router.put('/:id/status', (0, validate_1.validate)(contracts_validator_1.updateContractStatusSchema), contracts_controller_1.default.updateContractStatus);
// DELETE /api/contracts/:id
router.delete('/:id', contracts_controller_1.default.deleteContract);
exports.default = router;
