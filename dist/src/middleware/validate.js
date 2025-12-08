"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
const zod_1 = require("zod");
const apiResponse_1 = require("../utils/apiResponse");
// ✅ POPRAWKA: Użyj z.ZodType zamiast AnyZodObject
function validate(schema) {
    return async (req, res, next) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const errors = error.issues.map((issue) => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                }));
                return (0, apiResponse_1.errorResponse)(res, 'VALIDATION_ERROR', 'Dane nie przeszły walidacji', 400, errors);
            }
            next(error);
        }
    };
}
