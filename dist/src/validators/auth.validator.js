"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z
            .string()
            .min(1, 'Email jest wymagany')
            .email('Nieprawidłowy format email'),
        password: zod_1.z
            .string()
            .min(8, 'Hasło musi mieć minimum 8 znaków')
            .regex(/[A-Z]/, 'Hasło musi zawierać wielką literę')
            .regex(/[a-z]/, 'Hasło musi zawierać małą literę')
            .regex(/[0-9]/, 'Hasło musi zawierać cyfrę'),
        name: zod_1.z
            .string()
            .min(2, 'Imię musi mieć minimum 2 znaki')
            .max(50, 'Imię może mieć maksymalnie 50 znaków')
            .optional(),
    }),
});
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().min(1, 'Email jest wymagany').email('Nieprawidłowy format email'),
        password: zod_1.z.string().min(1, 'Hasło jest wymagane'),
    }),
});
