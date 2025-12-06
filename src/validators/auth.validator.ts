import { z } from 'zod';

export const registerSchema = z.object({
    body: z.object({
        email: z
            .string()
            .min(1, 'Email jest wymagany')
            .email('Nieprawidłowy format email'),
        password: z
            .string()
            .min(8, 'Hasło musi mieć minimum 8 znaków')
            .regex(/[A-Z]/, 'Hasło musi zawierać wielką literę')
            .regex(/[a-z]/, 'Hasło musi zawierać małą literę')
            .regex(/[0-9]/, 'Hasło musi zawierać cyfrę'),
        name: z
            .string()
            .min(2, 'Imię musi mieć minimum 2 znaki')
            .max(50, 'Imię może mieć maksymalnie 50 znaków')
            .optional(),
    }),
});

export const loginSchema = z.object({
    body: z.object({
        email: z.string().min(1, 'Email jest wymagany').email('Nieprawidłowy format email'),
        password: z.string().min(1, 'Hasło jest wymagane'),
    }),
});