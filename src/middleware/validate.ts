// src/middleware/validate.ts
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export function validate(schema: z.ZodType<unknown, z.ZodTypeDef, unknown>) {
    return async (req: Request, _res: Response, next: NextFunction) => {
        try {
            const method = req.method.toUpperCase();

            const isLegacySchema = 'shape' in schema &&
                typeof schema.shape === 'object' &&
                schema.shape !== null &&
                'body' in schema.shape;

            let dataToValidate: unknown;

            if (isLegacySchema) {
                dataToValidate = {
                    body: req.body,
                    query: req.query,
                    params: req.params,
                };
            } else {
                if (method === 'GET' || method === 'DELETE') {
                    dataToValidate = req.query;
                } else {
                    dataToValidate = req.body;
                }
            }

            await schema.parseAsync(dataToValidate);
            next();
        } catch (err) {
            next(err);
        }
    };
}