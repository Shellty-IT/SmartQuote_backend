"use strict";
// smartquote_backend/src/routes/publicOffer.routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const publicOffer_controller_1 = require("../controllers/publicOffer.controller");
const validate_1 = require("../middleware/validate");
const publicOffer_validator_1 = require("../validators/publicOffer.validator");
const router = (0, express_1.Router)();
router.get('/:token', (0, validate_1.validate)(publicOffer_validator_1.getPublicOfferSchema), publicOffer_controller_1.publicOfferController.getOffer);
router.post('/:token/view', (0, validate_1.validate)(publicOffer_validator_1.viewPublicOfferSchema), publicOffer_controller_1.publicOfferController.registerView);
router.post('/:token/accept', (0, validate_1.validate)(publicOffer_validator_1.acceptPublicOfferSchema), publicOffer_controller_1.publicOfferController.acceptOffer);
router.post('/:token/reject', (0, validate_1.validate)(publicOffer_validator_1.rejectPublicOfferSchema), publicOffer_controller_1.publicOfferController.rejectOffer);
router.post('/:token/comment', (0, validate_1.validate)(publicOffer_validator_1.commentPublicOfferSchema), publicOffer_controller_1.publicOfferController.addComment);
router.patch('/:token/selection', (0, validate_1.validate)(publicOffer_validator_1.selectionPublicOfferSchema), publicOffer_controller_1.publicOfferController.trackSelection);
exports.default = router;
