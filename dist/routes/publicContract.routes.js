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
const signContractSchema = zod_1.z.object({
    params: zod_1.z.object({
        token: zod_1.z.string().min(1, 'Token jest wymagany'),
    }),
    body: zod_1.z.object({
        signerName: zod_1.z.string().min(2, 'Imię i nazwisko musi mieć minimum 2 znaki'),
        signerEmail: zod_1.z.string().email('Podaj prawidłowy adres email'),
        signatureImage: zod_1.z.string().refine((val) => val.startsWith('data:image/'), 'Nieprawidłowy format podpisu'),
    }),
});
const router = (0, express_1.Router)();
router.get('/:token', (0, validate_1.validate)(tokenSchema), publicContract_controller_1.publicContractController.getContract);
router.get('/:token/pdf', (0, validate_1.validate)(tokenSchema), publicContract_controller_1.publicContractController.downloadPdf);
router.post('/:token/sign', (0, validate_1.validate)(signContractSchema), publicContract_controller_1.publicContractController.signContract);
exports.default = router;
