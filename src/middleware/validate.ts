// src/middleware/validate.ts
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export function validate(schema: z.ZodType<unknown, z.ZodTypeDef, unknown>) {
    return async (req: Request, _res: Response, next: NextFunction) => {
        try {
            const parsed = await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            }) as { body?: unknown; query?: unknown; params?: unknown };

            if (parsed.body !== undefined) {
                req.body = parsed.body;
            }
            if (parsed.query !== undefined) {
                req.query = parsed.query as typeof req.query;
            }
            if (parsed.params !== undefined) {
                req.params = parsed.params as typeof req.params;
            }

            next();
        } catch (err) {
            next(err);
        }
    };
}