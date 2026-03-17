"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// smartquote_backend/src/routes/contracts.routes.ts
const express_1 = require("express");
const contracts_controller_1 = __importDefault(require("../controllers/contracts.controller"));
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const contracts_validator_1 = require("../validators/contracts.validator");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', contracts_controller_1.default.getContracts);
router.get('/stats', contracts_controller_1.default.getContractsStats);
router.get('/:id/pdf', contracts_controller_1.default.generateContractPDF);
router.get('/:id', contracts_controller_1.default.getContractById);
router.post('/', (0, validate_1.validate)(contracts_validator_1.createContractSchema), contracts_controller_1.default.createContract);
router.post('/from-offer/:offerId', contracts_controller_1.default.createContractFromOffer);
router.post('/:id/publish', contracts_controller_1.default.publishContract);
router.put('/:id', (0, validate_1.validate)(contracts_validator_1.updateContractSchema), contracts_controller_1.default.updateContract);
router.put('/:id/status', (0, validate_1.validate)(contracts_validator_1.updateContractStatusSchema), contracts_controller_1.default.updateContractStatus);
router.delete('/:id/publish', contracts_controller_1.default.unpublishContract);
router.delete('/:id', contracts_controller_1.default.deleteContract);
exports.default = router;
