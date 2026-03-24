// smartquote_backend/src/controllers/auth.controller.ts

import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { config } from '../config';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import { AuthenticatedRequest } from '@/types';

export class AuthController {
    async register(req: Request, res: Response) {
        try {
            const { email, password, name } = req.body;

            const existingUser = await prisma.user.findUnique({
                where: { email: email.toLowerCase() },
            });

            if (existingUser) {
                return errorResponse(res, 'USER_EXISTS', 'Użytkownik z tym adresem email już istnieje', 409);
            }

            const hashedPassword = await bcrypt.hash(password, config.saltRounds);

            const user = await prisma.user.create({
                data: {
                    email: email.toLowerCase(),
                    password: hashedPassword,
                    name: name || null,
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    createdAt: true,
                },
            });

            console.log(`[AUTH] Nowy użytkownik: ${user.email}`);

            return successResponse(res, { user, message: 'Konto utworzone pomyślnie' }, 201);
        } catch (error) {
            console.error('[AUTH] Register error:', error);
            return errorResponse(res, 'REGISTER_FAILED', 'Błąd rejestracji', 500);
        }
    }

    async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;

            const user = await prisma.user.findUnique({
                where: { email: email.toLowerCase() },
            });

            if (!user) {
                return errorResponse(res, 'INVALID_CREDENTIALS', 'Nieprawidłowy email lub hasło', 401);
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (!isPasswordValid) {
                console.log(`[AUTH] Nieudane logowanie: ${email}`);
                return errorResponse(res, 'INVALID_CREDENTIALS', 'Nieprawidłowy email lub hasło', 401);
            }

            const signOptions: SignOptions = {
                expiresIn: '24h',
            };

            const token = jwt.sign(
                { id: user.id, email: user.email },
                config.jwtSecret,
                signOptions
            );

            console.log(`[AUTH] Zalogowano: ${user.email}`);

            return successResponse(res, {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                },
                token,
            });
        } catch (error) {
            console.error('[AUTH] Login error:', error);
            return errorResponse(res, 'LOGIN_FAILED', 'Błąd logowania', 500);
        }
    }

    async me(req: AuthenticatedRequest, res: Response) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: req.user!.id },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    phone: true,
                    avatar: true,
                    role: true,
                    createdAt: true,
                    companyInfo: {
                        select: {
                            name: true,
                            nip: true,
                            address: true,
                            city: true,
                            postalCode: true,
                        },
                    },
                },
            });

            if (!user) {
                return errorResponse(res, 'NOT_FOUND', 'Użytkownik nie znaleziony', 404);
            }

            // Zwróć dane z company z companyInfo dla kompatybilności wstecznej
            const response = {
                ...user,
                company: user.companyInfo?.name || null,
            };

            return successResponse(res, response);
        } catch (error) {
            console.error('[AUTH] Me error:', error);
            return errorResponse(res, 'FETCH_FAILED', 'Błąd pobierania danych', 500);
        }
    }
}

export const authController = new AuthController();