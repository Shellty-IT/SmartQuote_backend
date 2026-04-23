// src/middleware/errorHandler.ts

import { Request, Response, NextFunction } from 'express';
import { DomainError } from '../errors/domain.errors';
import { ZodError } from 'zod';

interface ErrorBody {
    success: false;
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
}

function buildErrorBody(code: string, message: string, details?: unknown): ErrorBody {
    return {
        success: false,
        error: { code, message, ...(details !== undefined ? { details } : {}) },
    };
}

export function errorHandler(
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
): void {
    if (err instanceof DomainError) {
        res.status(err.statusCode).json(buildErrorBody(err.code, err.message));
        return;
    }

    if (err instanceof ZodError) {
        res.status(422).json(
            buildErrorBody(
                'VALIDATION_ERROR',
                'Dane wejściowe są nieprawidłowe',
                err.flatten().fieldErrors,
            ),
        );
        return;
    }

    if (err instanceof Error) {
        const isDev = process.env.NODE_ENV === 'development';
        res.status(500).json(
            buildErrorBody(
                'INTERNAL_ERROR',
                isDev ? err.message : 'Wystąpił wewnętrzny błąd serwera',
            ),
        );
        return;
    }

    res.status(500).json(buildErrorBody('INTERNAL_ERROR', 'Wystąpił nieznany błąd'));
}