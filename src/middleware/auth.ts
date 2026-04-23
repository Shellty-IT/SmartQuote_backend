// src/middleware/auth.ts

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../types';
import { config } from '../config';
import { UnauthorizedError } from '../errors/domain.errors';
import prisma from '../lib/prisma';

interface JwtPayload {
    id: string;
    email: string;
}

export async function authenticate(
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            throw new UnauthorizedError('Brak tokenu autoryzacji');
        }

        const token = authHeader.substring(7);

        let decoded: JwtPayload;
        try {
            decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
        } catch {
            throw new UnauthorizedError('Nieprawidłowy lub wygasły token');
        }

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
            },
        });

        if (!user || !user.isActive) {
            throw new UnauthorizedError('Użytkownik nie istnieje lub jest nieaktywny');
        }

        req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        };

        next();
    } catch (err) {
        next(err);
    }
}

export function authorize(...roles: string[]) {
    return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
        try {
            if (!req.user) {
                throw new UnauthorizedError('Nie zalogowano');
            }

            if (roles.length > 0 && !roles.includes(req.user.role)) {
                throw new UnauthorizedError('Brak uprawnień do wykonania tej operacji');
            }

            next();
        } catch (err) {
            next(err);
        }
    };
}