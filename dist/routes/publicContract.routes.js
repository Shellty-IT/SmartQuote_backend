"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// smartquote_backend/src/routes/publicContract.routes.ts
const express_1 = require("express");
const publicContract_controller_1 = require("../controllers/publicContract.controller");
const validate_1 = require("../middleware/validate");
const zod_1 = require("zod");
const tokenSchema = zod_1.z.object({
    params: zod_1.z.object({
        token: zod_1.z.string().min(1, 'Token jest wymagany'),
    }),
});
const router = (0, express_1.Router)();
router.get('/:token', (0, validate_1.validate)(tokenSchema), publicContract_controller_1.publicContractController.getContract);
router.get('/:token/pdf', (0, validate_1.validate)(tokenSchema), publicContract_controller_1.publicContractController.downloadPdf);
exports.default = router;
