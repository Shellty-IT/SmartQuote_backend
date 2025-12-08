"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const clients_controller_1 = require("../controllers/clients.controller");
const validate_1 = require("../middleware/validate");
const auth_1 = require("../middleware/auth");
const clients_validator_1 = require("../validators/clients.validator");
const router = (0, express_1.Router)();
// Wszystkie trasy wymagają autoryzacji
router.use(auth_1.authenticate);
router.get('/stats', clients_controller_1.clientsController.getStats);
router.get('/', (0, validate_1.validate)(clients_validator_1.listClientsSchema), clients_controller_1.clientsController.findAll);
router.get('/:id', (0, validate_1.validate)(clients_validator_1.getClientSchema), clients_controller_1.clientsController.findById);
router.post('/', (0, validate_1.validate)(clients_validator_1.createClientSchema), clients_controller_1.clientsController.create);
router.put('/:id', (0, validate_1.validate)(clients_validator_1.updateClientSchema), clients_controller_1.clientsController.update);
router.delete('/:id', (0, validate_1.validate)(clients_validator_1.getClientSchema), clients_controller_1.clientsController.delete);
exports.default = router;
