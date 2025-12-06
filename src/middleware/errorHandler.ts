import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { errorResponse } from '../utils/apiResponse';
import { isDev } from '../config';

export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    console.error('[ERROR]', err);

    // Prisma errors
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        switch (err.code) {
            case 'P2002':
                errorResponse(res, 'DUPLICATE_ENTRY', 'Rekord już istnieje', 409);
                return;
            case 'P2025':
                errorResponse(res, 'NOT_FOUND', 'Nie znaleziono rekordu', 404);
                return;
            case 'P2003':
                errorResponse(res, 'FOREIGN_KEY_ERROR', 'Nieprawidłowa relacja', 400);
                return;
            default:
                errorResponse(res, 'DATABASE_ERROR', 'Błąd bazy danych', 500);
                return;
        }
    }

    if (err instanceof Prisma.PrismaClientValidationError) {
        errorResponse(res, 'VALIDATION_ERROR', 'Nieprawidłowe dane', 400);
        return;
    }

    // Default error
    errorResponse(
        res,
        'INTERNAL_ERROR',
        isDev ? err.message : 'Wewnętrzny błąd serwera',
        500,
        isDev ? err.stack : undefined
    );
}