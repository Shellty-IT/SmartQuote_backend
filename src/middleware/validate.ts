// src/middleware/validate.ts
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export function validate(schema: z.ZodType<unknown, z.ZodTypeDef, unknown>) {
    return async (req: Request, _res: Response, next: NextFunction) => {
        try {
            const method = req.method.toUpperCase();

            if (method === 'GET' || method === 'DELETE') {
                await schema.parseAsync(req.query);
            } else {
                await schema.parseAsync(req.body);
            }

            next();
        } catch (err) {
            next(err);
        }
    };
}