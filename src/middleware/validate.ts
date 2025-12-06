import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodIssue } from 'zod';
import { errorResponse } from '../utils/apiResponse';

// ✅ POPRAWKA: Użyj z.ZodType zamiast AnyZodObject
export function validate(schema: z.ZodType<any, any, any>) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const errors = error.issues.map((issue: ZodIssue) => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                }));
                return errorResponse(res, 'VALIDATION_ERROR', 'Dane nie przeszły walidacji', 400, errors);
            }
            next(error);
        }
    };
}