// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { DomainError } from '../errors/domain.errors';
import { ZodError } from 'zod';
import { logger } from '../lib/logger';

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

function formatZodErrors(error: ZodError) {
    return error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
    }));
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
    const requestId = (req as Request & { id?: string }).id;

    if (err instanceof DomainError) {
        logger.warn(
            {
                requestId,
                code: err.code,
                message: err.message,
                statusCode: err.statusCode,
            },
            'Domain error',
        );

        res.status(err.statusCode).json(buildErrorBody(err.code, err.message));
        return;
    }

    if (err instanceof ZodError) {
        logger.warn(
            {
                requestId,
                issues: err.issues,
            },
            'Validation error',
        );

        res.status(422).json(
            buildErrorBody('VALIDATION_ERROR', 'Dane wejściowe są nieprawidłowe', formatZodErrors(err)),
        );
        return;
    }

    if (err instanceof Error) {
        const isDev = process.env.NODE_ENV === 'development';

        logger.error(
            {
                requestId,
                error: err,
                stack: err.stack,
            },
            'Unhandled error',
        );

        res.status(500).json(
            buildErrorBody('INTERNAL_ERROR', isDev ? err.message : 'Wystąpił wewnętrzny błąd serwera'),
        );
        return;
    }

    logger.error({ requestId, error: err }, 'Unknown error type');
    res.status(500).json(buildErrorBody('INTERNAL_ERROR', 'Wystąpił nieznany błąd'));
}