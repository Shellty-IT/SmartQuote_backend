"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const client_1 = require("@prisma/client");
const apiResponse_1 = require("../utils/apiResponse");
const config_1 = require("../config");
function errorHandler(err, req, res, next) {
    console.error('[ERROR]', err);
    // Prisma errors
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        switch (err.code) {
            case 'P2002':
                (0, apiResponse_1.errorResponse)(res, 'DUPLICATE_ENTRY', 'Rekord już istnieje', 409);
                return;
            case 'P2025':
                (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Nie znaleziono rekordu', 404);
                return;
            case 'P2003':
                (0, apiResponse_1.errorResponse)(res, 'FOREIGN_KEY_ERROR', 'Nieprawidłowa relacja', 400);
                return;
            default:
                (0, apiResponse_1.errorResponse)(res, 'DATABASE_ERROR', 'Błąd bazy danych', 500);
                return;
        }
    }
    if (err instanceof client_1.Prisma.PrismaClientValidationError) {
        (0, apiResponse_1.errorResponse)(res, 'VALIDATION_ERROR', 'Nieprawidłowe dane', 400);
        return;
    }
    // Default error
    (0, apiResponse_1.errorResponse)(res, 'INTERNAL_ERROR', config_1.isDev ? err.message : 'Wewnętrzny błąd serwera', 500, config_1.isDev ? err.stack : undefined);
}
