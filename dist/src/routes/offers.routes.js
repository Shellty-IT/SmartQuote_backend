"use strict";
// backend/src/routes/offers.routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const offers_controller_1 = require("../controllers/offers.controller");
const validate_1 = require("../middleware/validate");
const auth_1 = require("../middleware/auth");
const offers_validator_1 = require("../validators/offers.validator");
const router = (0, express_1.Router)();
// Wszystkie trasy wymagają autoryzacji
router.use(auth_1.authenticate);
// Kolejność ma znaczenie! Bardziej specyficzne trasy najpierw
router.get('/stats', offers_controller_1.offersController.getStats);
router.get('/', (0, validate_1.validate)(offers_validator_1.listOffersSchema), offers_controller_1.offersController.findAll);
// PDF musi być przed /:id żeby nie był matchowany jako id
router.get('/:id/pdf', offers_controller_1.offersController.generatePDF);
router.get('/:id', (0, validate_1.validate)(offers_validator_1.getOfferSchema), offers_controller_1.offersController.findById);
router.post('/', (0, validate_1.validate)(offers_validator_1.createOfferSchema), offers_controller_1.offersController.create);
router.post('/:id/duplicate', (0, validate_1.validate)(offers_validator_1.getOfferSchema), offers_controller_1.offersController.duplicate);
router.put('/:id', (0, validate_1.validate)(offers_validator_1.updateOfferSchema), offers_controller_1.offersController.update);
router.delete('/:id', (0, validate_1.validate)(offers_validator_1.getOfferSchema), offers_controller_1.offersController.delete);
exports.default = router;
